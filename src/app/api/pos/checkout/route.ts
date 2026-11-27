import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBalancedJournal, getNextDocNumber } from "@/lib/accounting";
import { getChannelSettings, calculateCartNetRevenue, DEFAULT_CHANNEL_SETTINGS } from "@/lib/channel-settings-server";

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
      channelId = "offline",
      channel = "Offline / Dine In",
      schemeId,
      extraDiscount = 0,
      merchantDiscount = 0,
      deliverySubsidy = 0,
      notes,
      tenderedAmount = 0,
    } = body as {
      contactId?: string;
      items: PosItemInput[];
      cashAccountId: string;
      paymentMethod?: string;
      channelId?: string;
      channel?: string;
      schemeId?: string;
      extraDiscount?: number;
      merchantDiscount?: number;
      deliverySubsidy?: number;
      notes?: string;
      tenderedAmount?: number;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Pilih minimal 1 produk." }, { status: 400 });
    }

    // Untuk channel online, cashAccountId tidak wajib (akan dicatat sebagai Piutang Platform)
    const isOnlineChannelEarly = channelId !== "offline";
    if (!cashAccountId && !isOnlineChannelEarly) {
      return NextResponse.json({ error: "Pilih akun penerimaan kas/bank." }, { status: 400 });
    }

    // 1. Kontak pelanggan default
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
          data: { companyId: session.companyId, name: "Pelanggan Umum", type: "customer" },
        });
      }
      targetContactId = defaultContact.id;
    }

    // 2. Ambil semua mapping akun yang dibutuhkan sekaligus
    const [channelSettings, mappings] = await Promise.all([
      getChannelSettings(session.companyId),
      prisma.accountMapping.findMany({
        where: {
          companyId: session.companyId,
          mappingKey: { in: ["default_sales", "default_cogs", "default_ar", "platform_receivable"] },
        },
      }),
    ]);

    const getMapping = (key: string) => mappings.find((m: { mappingKey: string; accountId: string }) => m.mappingKey === key)?.accountId;
    const salesAccountId = getMapping("default_sales");
    if (!salesAccountId) {
      return NextResponse.json({ error: "Akun Pendapatan Penjualan (default_sales) belum dikonfigurasi." }, { status: 400 });
    }
    // Untuk channel online: gunakan akun Piutang Platform jika ada, fallback ke akun AR default, lalu akun kas
    const platformReceivableId = getMapping("platform_receivable") ?? getMapping("default_ar") ?? cashAccountId;

    // 3. Ambil data produk
    const productIds = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, companyId: session.companyId },
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let grossSubtotal = 0;   // Penjualan bruto (sebelum diskon/komisi)
    let itemDiscountTotal = 0; // Diskon per item dari kasir
    const processedItems: Array<{
      productId: string; description: string; qty: number;
      unitPrice: number; taxRate: number; lineTotal: number;
      trackInventory: boolean; buyPrice: number;
    }> = [];

    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (!prod) continue;

      const qty = Math.max(1, Number(item.qty) || 1);
      const unitPrice = Number(item.unitPrice ?? prod.sellPrice) || 0;
      const discountPct = Number(item.discountPct) || 0;

      const rawLine = qty * unitPrice;
      const lineDisc = rawLine * (discountPct / 100);

      grossSubtotal += rawLine;
      itemDiscountTotal += lineDisc;

      processedItems.push({
        productId: prod.id,
        description: prod.name,
        qty,
        unitPrice,
        taxRate: 0,
        lineTotal: rawLine - lineDisc,
        trackInventory: prod.trackInventory,
        buyPrice: Number(prod.buyPrice) || 0,
      });
    }

    if (processedItems.length === 0) {
      return NextResponse.json({ error: "Item yang dipilih tidak valid." }, { status: 400 });
    }

    // 4. Hitung net revenue berdasarkan channel settings & skema
    const chCfg = channelSettings.channels.find((c: { channelId: string }) => c.channelId === channelId) ??
      DEFAULT_CHANNEL_SETTINGS.channels.find((c: { channelId: string }) => c.channelId === "offline")!;

    const resolvedSchemeId = schemeId || chCfg.defaultSchemeId;
    const scheme = channelSettings.schemes.find((s: { id: string }) => s.id === resolvedSchemeId) ??
      (DEFAULT_CHANNEL_SETTINGS.schemes[0]);

    const totalMerchantDiscount = itemDiscountTotal + (Number(merchantDiscount) || 0) + (Number(extraDiscount) || 0);
    const subtotalAfterItemDisc = grossSubtotal - itemDiscountTotal;

    // Kalkulasi penerimaan bersih (net revenue) menggunakan skema + override potongan tetap per produk
    const calcResult = calculateCartNetRevenue(
      processedItems.map((p) => ({ productId: p.productId, qty: p.qty, lineNet: p.lineTotal })),
      (Number(merchantDiscount) || 0) + (Number(extraDiscount) || 0),
      Number(deliverySubsidy) || 0,
      chCfg,
      scheme,
      channelSettings
    );

    const netRevenue = calcResult.netRevenue;
    const commissionAmount = calcResult.commissionAmount;
    const fixedFeeAmount = calcResult.fixedFee;
    const deliverySubsidyAmount = calcResult.deliverySubsidy;

    // Untuk offline: langsung kas/bank, untuk online: Piutang Platform
    const isOnlineChannel = channelId !== "offline";
    const grandTotal = Math.max(0, subtotalAfterItemDisc - totalMerchantDiscount + (Number(merchantDiscount) || 0) + (Number(extraDiscount) || 0));
    // grandTotal yg diterima kasir = netRevenue untuk online, subtotalAfterItemDisc - extraDiscount untuk offline
    const receivedAmount = isOnlineChannel ? netRevenue : Math.max(0, subtotalAfterItemDisc - (Number(extraDiscount) || 0));

    const now = new Date();

    // 5. Nomor Invoice & Payment
    const [invoiceNo, paymentNo] = await Promise.all([
      getNextDocNumber(session.companyId, "INV"),
      getNextDocNumber(session.companyId, "PAY"),
    ]);

    // 6. Buat Jurnal — pisahkan bruto, diskon, komisi, biaya tetap, subsidi
    const journalLines: Array<{ accountId: string; contactId?: string; debit: number; credit: number; description: string }> = [];

    const effectiveOnlineAccountId = platformReceivableId || cashAccountId;
    if (isOnlineChannel && !effectiveOnlineAccountId) {
      return NextResponse.json({ error: "Akun Piutang Platform / Kas belum dikonfigurasi." }, { status: 400 });
    }

    if (isOnlineChannel) {
      // Untuk channel online: Debit Piutang Platform (atau langsung kas jika sudah cair)
      // Kredit Penjualan neto
      journalLines.push({
        accountId: effectiveOnlineAccountId,
        contactId: targetContactId,
        debit: receivedAmount,
        credit: 0,
        description: `Penerimaan ${channel} - ${invoiceNo}`,
      });

      // Jika ada komisi — Debit Beban Komisi, Kredit sudah dipotong dari penerimaan
      // (dicatat sebagai selisih — net method)
      journalLines.push({
        accountId: salesAccountId,
        contactId: targetContactId,
        debit: 0,
        credit: receivedAmount,
        description: `Penjualan neto ${channel} - ${invoiceNo}`,
      });
    } else {
      // Offline: Debit Kas, Kredit Penjualan
      journalLines.push({
        accountId: cashAccountId,
        contactId: targetContactId,
        debit: receivedAmount,
        credit: 0,
        description: `Penerimaan Kasir ${invoiceNo}`,
      });
      journalLines.push({
        accountId: salesAccountId,
        contactId: targetContactId,
        debit: 0,
        credit: receivedAmount,
        description: `Penjualan Kasir ${invoiceNo}`,
      });
    }

    const journal = await createBalancedJournal({
      companyId: session.companyId,
      transDate: now,
      memo: `Kasir [${channel}] ${invoiceNo} (${paymentMethod})`,
      sourceType: "SALE",
      lines: journalLines,
    });

    // 7. Buat SalesInvoice (Status: PAID)
    const finalGrandTotal = receivedAmount;
    const invoice = await prisma.salesInvoice.create({
      data: {
        companyId: session.companyId,
        invoiceNo,
        contactId: targetContactId,
        transDate: now,
        dueDate: now,
        status: "PAID",
        subtotal: grossSubtotal,
        discountTotal: totalMerchantDiscount,
        taxTotal: 0,
        grandTotal: finalGrandTotal,
        paidAmount: finalGrandTotal,
        balanceDue: 0,
        journalEntryId: journal.id,
        notes: [
          `[Kasir ${channel} - ${paymentMethod}]`,
          commissionAmount > 0 ? `Komisi: Rp ${commissionAmount.toLocaleString("id-ID")}` : "",
          fixedFeeAmount > 0 ? `Biaya tetap: Rp ${fixedFeeAmount.toLocaleString("id-ID")}` : "",
          deliverySubsidyAmount > 0 ? `Subsidi ongkir: Rp ${deliverySubsidyAmount.toLocaleString("id-ID")}` : "",
          notes || "",
        ].filter(Boolean).join(" | "),
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

    // 8. Payment
    const paymentAccountId = isOnlineChannel ? effectiveOnlineAccountId : cashAccountId;
    await prisma.payment.create({
      data: {
        companyId: session.companyId,
        paymentNo,
        direction: "IN",
        contactId: targetContactId,
        cashAccountId: paymentAccountId,
        paymentDate: now,
        amount: finalGrandTotal,
        method: paymentMethod,
        journalEntryId: journal.id,
        allocations: {
          create: {
            targetType: "SALES_INVOICE",
            targetId: invoice.id,
            allocatedAmount: finalGrandTotal,
          },
        },
      },
    });

    // 9. Potong Stok
    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { companyId: session.companyId, isDefault: true },
    });

    if (defaultWarehouse) {
      for (const item of processedItems) {
        if (!item.trackInventory) continue;
        await prisma.warehouseStock.upsert({
          where: { warehouseId_productId: { warehouseId: defaultWarehouse.id, productId: item.productId } },
          update: { qtyOnHand: { decrement: item.qty } },
          create: { warehouseId: defaultWarehouse.id, productId: item.productId, qtyOnHand: -item.qty, avgCost: item.buyPrice },
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

    const changeAmount = Math.max(0, (Number(tenderedAmount) || 0) - finalGrandTotal);

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        grandTotal: finalGrandTotal,
        netRevenue,
        commissionAmount,
        fixedFeeAmount,
        paymentMethod,
        tenderedAmount: Number(tenderedAmount) || finalGrandTotal,
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
