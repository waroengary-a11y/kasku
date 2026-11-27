import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface EditItemInput {
  productId?: string | null;
  description: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  discount?: number;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const invoice = await prisma.salesInvoice.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      contact: true,
      items: { include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });

  const payments = await prisma.paymentAllocation.findMany({
    where: { targetType: "SALES_INVOICE", targetId: id },
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
        unitPrice: Number(it.unitPrice),
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

  const existing = await prisma.salesInvoice.findFirst({
    where: { id, companyId: session.companyId },
  });
  if (!existing) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });

  if (body.action === "void") {
    if (existing.journalEntryId) {
      await prisma.journalEntry.update({
        where: { id: existing.journalEntryId },
        data: { status: "VOID" },
      });
    }
    const updated = await prisma.salesInvoice.update({
      where: { id },
      data: { status: "VOID" },
    });
    return NextResponse.json({ invoice: updated });
  }

  // Full Edit (diizinkan untuk OPEN, PARTIAL, maupun PAID selama belum VOID)
  if (existing.status === "VOID") {
    return NextResponse.json({ error: "Tagihan yang sudah dibatalkan tidak dapat diedit." }, { status: 400 });
  }

  const { contactId, transDate, dueDate, notes, items } = body as {
    contactId: string;
    transDate: string;
    dueDate: string;
    notes?: string;
    items: EditItemInput[];
  };

  if (!contactId || !transDate || !dueDate || !items?.length) {
    return NextResponse.json({ error: "Kontak, tanggal, jatuh tempo, dan item wajib diisi." }, { status: 400 });
  }

  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  const computedItems = items.map((it) => {
    const qty = Number(it.qty) || 0;
    const unitPrice = Number(it.unitPrice) || 0;
    const taxRate = Number(it.taxRate) || 0;
    const discount = Number(it.discount) || 0;

    const lineSubtotalBeforeDiscount = qty * unitPrice;
    const lineDiscount = lineSubtotalBeforeDiscount * (discount / 100);
    const lineSubtotal = lineSubtotalBeforeDiscount - lineDiscount;
    const lineTax = lineSubtotal * (taxRate / 100);
    const lineTotal = lineSubtotal + lineTax;

    subtotal += lineSubtotal;
    discountTotal += lineDiscount;
    taxTotal += lineTax;
    return { ...it, lineTotal };
  });

  const extraDiscount = Number(body.extraDiscount) || 0;
  const withholding = Number(body.withholding) || 0;
  const extraCharges = (Number(body.shippingFee) || 0) + (Number(body.transactionFee) || 0);
  const netRevenue = Math.max(0, subtotal - extraDiscount - withholding + extraCharges);
  const grandTotal = netRevenue + taxTotal;

  // Reverse previous stock movements for this invoice
  const oldMovements = await prisma.stockMovement.findMany({
    where: { sourceType: "SALE", sourceId: id },
  });
  for (const m of oldMovements) {
    await prisma.warehouseStock.updateMany({
      where: { warehouseId: m.warehouseId, productId: m.productId },
      data: { qtyOnHand: { increment: Number(m.qtyOut) } },
    });
  }
  await prisma.stockMovement.deleteMany({ where: { sourceType: "SALE", sourceId: id } });

  // Get account mappings
  const getMapped = async (key: string) => {
    const m = await prisma.accountMapping.findUnique({
      where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: key } },
    });
    return m?.accountId;
  };
  const arAccountId = await getMapped("default_ar");
  const salesAccountId = await getMapped("default_sales");
  const taxOutAccountId = await getMapped("default_tax_out");

  if (existing.journalEntryId && arAccountId && salesAccountId) {
    const newLines: Array<{
      accountId: string;
      contactId: string | null;
      debit: number;
      credit: number;
      description: string;
    }> = [
      { accountId: arAccountId, contactId, debit: grandTotal, credit: 0, description: `Piutang ${existing.invoiceNo}` },
      { accountId: salesAccountId, contactId: null, debit: 0, credit: subtotal, description: `Penjualan ${existing.invoiceNo}` },
    ];
    if (taxTotal > 0 && taxOutAccountId) {
      newLines.push({
        accountId: taxOutAccountId,
        contactId: null,
        debit: 0,
        credit: taxTotal,
        description: `PPN Keluaran ${existing.invoiceNo}`,
      });
    }

    await prisma.journalLine.deleteMany({ where: { journalEntryId: existing.journalEntryId } });
    await prisma.journalEntry.update({
      where: { id: existing.journalEntryId },
      data: {
        transDate: new Date(transDate),
        memo: `Tagihan Penjualan ${existing.invoiceNo}`,
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
      await prisma.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: warehouse.id, productId: it.productId } },
        update: { qtyOnHand: { decrement: qty } },
        create: { warehouseId: warehouse.id, productId: it.productId, qtyOnHand: -qty, avgCost: Number(prod.buyPrice) },
      });
      await prisma.stockMovement.create({
        data: {
          warehouseId: warehouse.id,
          productId: it.productId,
          sourceType: "SALE",
          sourceId: id,
          qtyOut: qty,
          unitCost: Number(prod.buyPrice),
        },
      });
    }
  }

  const existingPaid = Number(existing.paidAmount) || 0;
  const newBalanceDue = Math.max(0, grandTotal - existingPaid);
  const newStatus = newBalanceDue <= 0 ? "PAID" : existingPaid > 0 ? "PARTIAL" : "OPEN";

  await prisma.salesInvoiceItem.deleteMany({ where: { salesInvoiceId: id } });
  const updated = await prisma.salesInvoice.update({
    where: { id },
    data: {
      contactId,
      transDate: new Date(transDate),
      dueDate: new Date(dueDate),
      notes: notes || null,
      subtotal,
      discountTotal: discountTotal + extraDiscount + withholding,
      taxTotal,
      grandTotal,
      balanceDue: newBalanceDue,
      status: newStatus,
      items: {
        create: computedItems.map((it) => ({
          productId: it.productId || null,
          description: it.description,
          qty: Number(it.qty),
          unitPrice: Number(it.unitPrice),
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

  const existing = await prisma.salesInvoice.findFirst({ where: { id, companyId: session.companyId } });
  if (!existing) return NextResponse.json({ error: "Tagihan tidak ditemukan." }, { status: 404 });
  if (Number(existing.paidAmount) > 0) {
    return NextResponse.json({ error: "Tagihan sudah ada pembayaran, tidak bisa dihapus." }, { status: 400 });
  }

  // Reverse stock movements
  const oldMovements = await prisma.stockMovement.findMany({
    where: { sourceType: "SALE", sourceId: id },
  });
  for (const m of oldMovements) {
    await prisma.warehouseStock.updateMany({
      where: { warehouseId: m.warehouseId, productId: m.productId },
      data: { qtyOnHand: { increment: Number(m.qtyOut) } },
    });
  }
  await prisma.stockMovement.deleteMany({ where: { sourceType: "SALE", sourceId: id } });

  if (existing.journalEntryId) {
    await prisma.journalEntry.delete({ where: { id: existing.journalEntryId } });
  }
  await prisma.salesInvoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
