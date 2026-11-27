import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";

interface PosItemInput {
  productId: string;
  qty: number;
  unitPrice: number;
  discountPct?: number;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      contactId,
      items,
      cashAccountId,
      paymentMethod = "Tunai",
      notes,
      tenderedAmount = 0,
    } = body as {
      contactId?: string;
      items: PosItemInput[];
      cashAccountId: string;
      paymentMethod?: string;
      notes?: string;
      tenderedAmount?: number;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Pilih minimal 1 produk." }, { status: 400 });
    }

    if (!cashAccountId) {
      return NextResponse.json({ error: "Pilih akun penerimaan kas/bank." }, { status: 400 });
    }

    // 1. Ambil kontak pelanggan (atau buat/gunakan default "Pelanggan Umum")
    let targetContactId = contactId;
    if (!targetContactId) {
      let defaultContact = await prisma.contact.findFirst({
        where: {
          companyId: session.companyId,
          type: { contains: "customer" },
          name: { in: ["Pelanggan Umum", "Umum", "Pelanggan Kasir", "Customer"] },
        },
      });

      if (!defaultContact) {
        defaultContact = await prisma.contact.findFirst({
          where: { companyId: session.companyId, type: { contains: "customer" } },
        });
      }

      if (!defaultContact) {
        defaultContact = await prisma.contact.create({
          data: {
            companyId: session.companyId,
            name: "Pelanggan Umum",
            type: "customer",
          },
        });
      }
      targetContactId = defaultContact.id;
    }

    // 2. Ambil mapping akun akuntansi
    const salesMapping = await prisma.accountMapping.findUnique({
      where: { companyId_mappingKey: { companyId: session.companyId, mappingKey: "default_sales" } },
    });

    const salesAccountId = salesMapping?.accountId;
    if (!salesAccountId) {
      return NextResponse.json({ error: "Akun Pendapatan Penjualan (default_sales) belum dikonfigurasi." }, { status: 400 });
    }

    // 3. Ambil data produk
    const productIds = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, companyId: session.companyId },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let subtotal = 0;
    let discountTotal = 0;
    const processedItems: Array<{
      productId: string;
      description: string;
      qty: number;
      unitPrice: number;
      taxRate: number;
      lineTotal: number;
      trackInventory: boolean;
      buyPrice: number;
    }> = [];

    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (!prod) continue;

      const qty = Math.max(1, Number(item.qty) || 1);
      const unitPrice = Number(item.unitPrice ?? prod.sellPrice) || 0;
      const discountPct = Number(item.discountPct) || 0;

      const rawLine = qty * unitPrice;
      const lineDisc = rawLine * (discountPct / 100);
      const netLine = rawLine - lineDisc;

      subtotal += netLine;
      discountTotal += lineDisc;

      processedItems.push({
        productId: prod.id,
        description: prod.name,
        qty,
        unitPrice,
        taxRate: 0,
        lineTotal: netLine,
        trackInventory: prod.trackInventory,
        buyPrice: Number(prod.buyPrice) || 0,
      });
    }

    if (processedItems.length === 0) {
      return NextResponse.json({ error: "Item yang dipilih tidak valid." }, { status: 400 });
    }

    const grandTotal = subtotal;
    const now = new Date();

    // 4. Nomor Invoice & Payment
    const [invoiceNo, paymentNo] = await Promise.all([
      getNextDocNumber(session.companyId, "INV"),
      getNextDocNumber(session.companyId, "PAY"),
    ]);

    // 5. Jurnal Penjualan Kas Langsung: Debit Kas/Bank, Kredit Penjualan
    const journal = await createBalancedJournal({
      companyId: session.companyId,
      transDate: now,
      memo: `Kasir POS ${invoiceNo} (${paymentMethod})`,
      sourceType: "SALE",
      lines: [
        {
          accountId: cashAccountId,
          contactId: targetContactId,
          debit: grandTotal,
          credit: 0,
          description: `Penerimaan Kasir ${invoiceNo}`,
        },
        {
          accountId: salesAccountId,
          contactId: targetContactId,
          debit: 0,
          credit: grandTotal,
          description: `Penjualan Kasir ${invoiceNo}`,
        },
      ],
    });

    // 6. Buat SalesInvoice (Status: PAID)
    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId: session.companyId,
        invoiceNo,
        contactId: targetContactId,
        transDate: now,
        dueDate: now,
        status: "PAID",
        subtotal,
        discountTotal,
        taxTotal: 0,
        grandTotal,
        paidAmount: grandTotal,
        balanceDue: 0,
        journalEntryId: journal.id,
        notes: notes ? `[Kasir POS - ${paymentMethod}] ${notes}` : `[Kasir POS - ${paymentMethod}]`,
        items: {
          create: processedItems.map((p) => ({
            productId: p.productId,
            description: p.description,
            qty: p.qty,
            unitPrice: p.unitPrice,
            taxRate: 0,
            lineTotal: p.lineTotal,
          })),
        },
      },
    });

    // 7. Catat Payment
    await prisma.payment.create({
      data: {
        companyId: session.companyId,
        paymentNo,
        direction: "IN",
        contactId: targetContactId,
        cashAccountId,
        paymentDate: now,
        amount: grandTotal,
        method: paymentMethod,
        journalEntryId: journal.id,
        allocations: {
          create: {
            targetType: "SALES_INVOICE",
            targetId: invoice.id,
            allocatedAmount: grandTotal,
          },
        },
      },
    });

    // 8. Potong Stok Inventori jika produk ditrack
    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { companyId: session.companyId, isDefault: true },
    });

    if (defaultWarehouse) {
      for (const item of processedItems) {
        if (!item.trackInventory) continue;

        await prisma.warehouseStock.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: defaultWarehouse.id,
              productId: item.productId,
            },
          },
          update: { qtyOnHand: { decrement: item.qty } },
          create: {
            warehouseId: defaultWarehouse.id,
            productId: item.productId,
            qtyOnHand: -item.qty,
            avgCost: item.buyPrice,
          },
        });

        await prisma.stockMovement.create({
          data: {
            warehouseId: defaultWarehouse.id,
            productId: item.productId,
            sourceType: "SALE",
            sourceId: invoice.id,
            qtyOut: item.qty,
            unitCost: item.buyPrice,
          },
        });
      }
    }

    const changeAmount = Math.max(0, (Number(tenderedAmount) || 0) - grandTotal);

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        grandTotal,
        paymentMethod,
        tenderedAmount: Number(tenderedAmount) || grandTotal,
        changeAmount,
        createdAt: invoice.createdAt,
      },
    });
  } catch (err: unknown) {
    console.error("[POST /api/pos/checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal memproses transaksi kasir." },
      { status: 500 }
    );
  }
}
