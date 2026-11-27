import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface EditPurchaseItemInput {
  productId?: string | null;
  description: string;
  qty: number;
  unitCost: number;
  taxRate: number;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      contact: true,
      items: { include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });

  const payments = await prisma.paymentAllocation.findMany({
    where: { targetType: "PURCHASE_INVOICE", targetId: id },
    include: { payment: true },
  });

  return NextResponse.json({
    invoice: {
      ...invoice,
      subtotal: Number(invoice.subtotal),
      taxTotal: Number(invoice.taxTotal),
      grandTotal: Number(invoice.grandTotal),
      paidAmount: Number(invoice.paidAmount),
      balanceDue: Number(invoice.balanceDue),
      items: invoice.items.map((it) => ({
        ...it,
        qty: Number(it.qty),
        unitCost: Number(it.unitCost),
        taxRate: Number(it.taxRate),
        lineTotal: Number(it.lineTotal),
      })),
    },
    payments,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.purchaseInvoice.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });

  if (body.action === "void") {
    if (existing.journalEntryId) {
      await prisma.journalEntry.update({ where: { id: existing.journalEntryId }, data: { status: "VOID" } });
    }
    const updated = await prisma.purchaseInvoice.update({ where: { id }, data: { status: "VOID" } });
    return NextResponse.json({ invoice: updated });
  }

  // Full Edit (diizinkan untuk OPEN, PARTIAL, maupun PAID selama belum VOID)
  if (existing.status === "VOID") {
    return NextResponse.json({ error: "Tagihan yang sudah dibatalkan tidak dapat diedit." }, { status: 400 });
  }

  const { contactId, transDate, dueDate, items } = body as {
    contactId: string;
    transDate: string;
    dueDate: string;
    items: EditPurchaseItemInput[];
  };

  if (!contactId || !transDate || !dueDate || !items?.length) {
    return NextResponse.json({ error: "Supplier, tanggal, jatuh tempo, dan item wajib diisi." }, { status: 400 });
  }

  let subtotal = 0;
  let taxTotal = 0;
  const computedItems = items.map((it) => {
    const lineNet = Number(it.qty) * Number(it.unitCost);
    const lineTax = lineNet * (Number(it.taxRate) / 100);
    subtotal += lineNet;
    taxTotal += lineTax;
    return { ...it, lineTotal: lineNet + lineTax };
  });

  const extraDiscount = Number(body.extraDiscount) || 0;
  const withholding = Number(body.withholding) || 0;
  const extraCharges = (Number(body.shippingFee) || 0) + (Number(body.transactionFee) || 0);
  const netCost = Math.max(0, subtotal - extraDiscount - withholding + extraCharges);
  const grandTotal = netCost + taxTotal;

  // Reverse old stock movements
  const oldMovements = await prisma.stockMovement.findMany({
    where: { sourceType: "PURCHASE", sourceId: id },
  });
  for (const m of oldMovements) {
    await prisma.warehouseStock.updateMany({
      where: { warehouseId: m.warehouseId, productId: m.productId },
      data: { qtyOnHand: { decrement: Number(m.qtyIn) } },
    });
  }
  await prisma.stockMovement.deleteMany({ where: { sourceType: "PURCHASE", sourceId: id } });

  const getMapped = async (key: string) => {
    const m = await prisma.accountMapping.findUnique({
      where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: key } },
    });
    return m?.accountId;
  };
  const apAccountId = await getMapped("default_ap");
  const invAccountId = await getMapped("default_inventory");
  const taxInAccountId = await getMapped("default_tax_in");

  if (existing.journalEntryId && apAccountId && invAccountId) {
    const productIds = computedItems.map((it) => it.productId).filter(Boolean) as string[];
    const prodList = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds }, companyId: session.companyId },
          select: { id: true, purchaseAccountId: true },
        })
      : [];
    const prodAccMap = new Map(prodList.map((p) => [p.id, p.purchaseAccountId]));

    const accountTotals = new Map<string, number>();
    for (const it of computedItems) {
      const accId = (it.productId && prodAccMap.get(it.productId)) || invAccountId;
      const lineNet = Number(it.qty) * Number(it.unitCost);
      accountTotals.set(accId, (accountTotals.get(accId) || 0) + lineNet);
    }

    const newLines: Array<{
      accountId: string;
      contactId: string | null;
      debit: number;
      credit: number;
      description: string;
    }> = [
      ...Array.from(accountTotals.entries())
        .filter(([, amt]) => amt > 0)
        .map(([accId, amt]) => ({
          accountId: accId,
          contactId: null,
          debit: amt,
          credit: 0,
          description: `Pembelian ${existing.billNo}`,
        })),
      { accountId: apAccountId, contactId, debit: 0, credit: grandTotal, description: `Utang ${existing.billNo}` },
    ];
    if (taxTotal > 0 && taxInAccountId) {
      newLines.push({
        accountId: taxInAccountId,
        contactId: null,
        debit: taxTotal,
        credit: 0,
        description: `PPN Masukan ${existing.billNo}`,
      });
    }

    await prisma.journalLine.deleteMany({ where: { journalEntryId: existing.journalEntryId } });
    await prisma.journalEntry.update({
      where: { id: existing.journalEntryId },
      data: {
        transDate: new Date(transDate),
        memo: `Tagihan Pembelian ${existing.billNo}`,
        lines: { create: newLines },
      },
    });
  }

  // Re-apply stock movements
  const warehouse = await prisma.warehouse.findFirst({
    where: { companyId: session.companyId, isDefault: true },
  });
  if (warehouse) {
    for (const it of computedItems) {
      if (!it.productId) continue;
      const prod = await prisma.product.findUnique({ where: { id: it.productId } });
      if (!prod || !prod.trackInventory) continue;
      const qty = Number(it.qty);
      const unitCost = Number(it.unitCost);
      await prisma.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: warehouse.id, productId: it.productId } },
        update: { qtyOnHand: { increment: qty }, avgCost: unitCost },
        create: { warehouseId: warehouse.id, productId: it.productId, qtyOnHand: qty, avgCost: unitCost },
      });
      await prisma.stockMovement.create({
        data: {
          warehouseId: warehouse.id,
          productId: it.productId,
          sourceType: "PURCHASE",
          sourceId: id,
          qtyIn: qty,
          unitCost,
        },
      });
    }
  }

  const existingPaid = Number(existing.paidAmount) || 0;
  const newBalanceDue = Math.max(0, grandTotal - existingPaid);
  const newStatus = newBalanceDue <= 0 ? "PAID" : existingPaid > 0 ? "PARTIAL" : "OPEN";

  await prisma.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoiceId: id } });
  const updated = await prisma.purchaseInvoice.update({
    where: { id },
    data: {
      contactId,
      transDate: new Date(transDate),
      dueDate: new Date(dueDate),
      subtotal,
      taxTotal,
      grandTotal,
      balanceDue: newBalanceDue,
      status: newStatus,
      items: {
        create: computedItems.map((it) => ({
          productId: it.productId || null,
          description: it.description,
          qty: Number(it.qty),
          unitCost: Number(it.unitCost),
          taxRate: Number(it.taxRate),
          lineTotal: it.lineTotal,
        })),
      },
    },
    include: { items: true, contact: true },
  });

  return NextResponse.json({ invoice: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.purchaseInvoice.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
  if (Number(existing.paidAmount) > 0) {
    return NextResponse.json({ error: "Tagihan sudah ada pembayaran, tidak bisa dihapus." }, { status: 400 });
  }

  // Reverse stock movements
  const oldMovements = await prisma.stockMovement.findMany({
    where: { sourceType: "PURCHASE", sourceId: id },
  });
  for (const m of oldMovements) {
    await prisma.warehouseStock.updateMany({
      where: { warehouseId: m.warehouseId, productId: m.productId },
      data: { qtyOnHand: { decrement: Number(m.qtyIn) } },
    });
  }
  await prisma.stockMovement.deleteMany({ where: { sourceType: "PURCHASE", sourceId: id } });

  if (existing.journalEntryId) {
    await prisma.journalEntry.delete({ where: { id: existing.journalEntryId } });
  }
  await prisma.purchaseInvoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
