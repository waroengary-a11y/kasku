import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { InvoiceFormClient } from "@/components/InvoiceFormClient";
import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";


export default async function EditSalesInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { session, company } = await requirePageSession();
  const { id } = await params;

  const [invoice, contacts, products, terms, taxes] = await Promise.all([
    prisma.salesInvoice.findFirst({
      where: { id, companyId: company.id },
      include: { items: true },
    }),
    prisma.contact.findMany({
      where: { companyId: company.id, type: { contains: "customer" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { companyId: company.id, isSold: true },
      select: { id: true, sku: true, barcode: true, name: true, unit: true, sellPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.paymentTerm.findMany({ where: { companyId: company.id }, orderBy: { days: "asc" } }),
    prisma.tax.findMany({ where: { companyId: company.id }, orderBy: { rate: "asc" } }),
  ]);

  if (!invoice) notFound();

  const subtotal = Number(invoice.subtotal);
  const taxTotal = Number(invoice.taxTotal);
  const grandTotal = Number(invoice.grandTotal);
  const discountTotal = Number(invoice.discountTotal);
  // Hitung selisih diskon/pemotongan jika ada
  const computedDiscount = Math.max(0, subtotal + taxTotal - grandTotal) || discountTotal;

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <InvoiceFormClient
        mode="edit"
        invoiceId={invoice.id}
        initialNo={invoice.invoiceNo}
        initialContactId={invoice.contactId}
        initialTransDate={invoice.transDate.toISOString().slice(0, 10)}
        initialDueDate={invoice.dueDate.toISOString().slice(0, 10)}
        initialNotes={invoice.notes || ""}
        initialItems={invoice.items.map((it) => ({
          productId: it.productId || "",
          description: it.description,
          qty: String(Number(it.qty)),
          unit: "pcs",
          discountPct: "0",
          unitPrice: String(Number(it.unitPrice)),
          taxRate: String(Number(it.taxRate)),
        }))}
        initialExtras={{
          extraDiscountType: "rp",
          extraDiscountValue: String(computedDiscount),
          shippingFee: "0",
          transactionFee: "0",
          withholdings: [],
          downPayment: String(Number(invoice.paidAmount) || 0),
        }}
        contacts={contacts}
        products={products.map((p) => ({ ...p, sellPrice: Number(p.sellPrice) }))}
        terms={terms}
        taxes={taxes.map((t) => ({ id: t.id, name: t.name, rate: Number(t.rate) }))}
      />
    </AppShell>
  );
}
