import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get("startDate");
  const endStr = searchParams.get("endDate");
  const companyId = session.companyId;

  const dateWhere: Record<string, unknown> = {};
  if (startStr) dateWhere.gte = new Date(startStr);
  if (endStr) dateWhere.lte = new Date(`${endStr}T23:59:59.999Z`);
  const dateFilter = Object.keys(dateWhere).length > 0 ? dateWhere : undefined;

  const [items, allProducts] = await Promise.all([
    prisma.salesInvoiceItem.findMany({
      where: {
        salesInvoice: {
          companyId,
          status: { not: "VOID" },
          ...(dateFilter ? { transDate: dateFilter } : {}),
        },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
        salesInvoice: {
          select: {
            id: true,
            invoiceNo: true,
            transDate: true,
            contact: { select: { name: true } },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { companyId },
      select: { id: true, name: true, sku: true, unit: true, sellPrice: true },
    }),
  ]);

  const productByName = new Map(
    allProducts.map((p) => [p.name.trim().toLowerCase(), p])
  );

  // Group by product
  const productMap = new Map<
    string,
    {
      productId: string | null;
      productName: string;
      sku: string;
      unit: string;
      totalQty: number;
      totalNilai: number;
      details: Array<{
        invoiceNo: string;
        transDate: string;
        customerName: string;
        qty: number;
        unitPrice: number;
        lineTotal: number;
      }>;
    }
  >();

  const addToMap = (
    key: string,
    meta: { productId: string | null; productName: string; sku: string; unit: string },
    detail: { invoiceNo: string; transDate: string; customerName: string; qty: number; unitPrice: number; lineTotal: number }
  ) => {
    if (!productMap.has(key)) {
      productMap.set(key, {
        productId: meta.productId,
        productName: meta.productName,
        sku: meta.sku,
        unit: meta.unit,
        totalQty: 0,
        totalNilai: 0,
        details: [],
      });
    }
    const entry = productMap.get(key)!;
    entry.totalQty += detail.qty;
    entry.totalNilai += detail.lineTotal;
    entry.details.push(detail);
  };

  for (const item of items) {
    const qty = Number(item.qty);
    const lt = Number(item.lineTotal);
    const invNo = item.salesInvoice.invoiceNo;
    const transDate = item.salesInvoice.transDate.toISOString();
    const customerName = item.salesInvoice.contact.name;

    if (item.productId && item.product) {
      addToMap(
        item.productId,
        {
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku ?? "",
          unit: item.product.unit ?? "pcs",
        },
        { invoiceNo: invNo, transDate, customerName, qty, unitPrice: Number(item.unitPrice), lineTotal: lt }
      );
      continue;
    }

    // Jika baris rekap kasir online (KSR-xxxx • 1x NAMA PRODUK, ... (Bruto ...)) belum punya productId,
    // pecah dan petakan ke produk terdaftar agar tidak muncul sebagai produk baru tanpa SKU
    const ksrMatch = item.description.match(/^KSR-\d+\s*•\s*(.+?)(?:\s*\(Bruto|$)/i);
    if (ksrMatch) {
      const parts = ksrMatch[1]
        .split(",")
        .map((s) => s.trim())
        .map((s) => {
          const m = s.match(/^(\d+(?:\.\d+)?)x\s+(.+)$/i);
          if (!m) return null;
          const q = Number(m[1]) || 1;
          const prod = productByName.get(m[2].trim().toLowerCase());
          return prod ? { prod, qty: q } : null;
        })
        .filter((x): x is { prod: (typeof allProducts)[number]; qty: number } => x !== null);

      if (parts.length > 0) {
        const totalWeight = parts.reduce((s, p) => s + (Number(p.prod.sellPrice) || 1) * p.qty, 0);
        let remaining = lt;
        parts.forEach((p, idx) => {
          const weight = (Number(p.prod.sellPrice) || 1) * p.qty;
          const share =
            idx === parts.length - 1
              ? remaining
              : totalWeight > 0
                ? Math.round((lt * weight) / totalWeight)
                : Math.round(lt / parts.length);
          remaining -= share;
          addToMap(
            p.prod.id,
            {
              productId: p.prod.id,
              productName: p.prod.name,
              sku: p.prod.sku ?? "",
              unit: p.prod.unit ?? "pcs",
            },
            {
              invoiceNo: invNo,
              transDate,
              customerName,
              qty: p.qty,
              unitPrice: p.qty > 0 ? Math.round(share / p.qty) : share,
              lineTotal: share,
            }
          );
        });
        continue;
      }
    }

    addToMap(
      `_desc_${item.description}`,
      {
        productId: null,
        productName: item.description,
        sku: "",
        unit: "pcs",
      },
      { invoiceNo: invNo, transDate, customerName, qty, unitPrice: Number(item.unitPrice), lineTotal: lt }
    );
  }

  const rows = Array.from(productMap.values()).sort(
    (a, b) => b.totalNilai - a.totalNilai
  );

  return NextResponse.json({ rows });
}
