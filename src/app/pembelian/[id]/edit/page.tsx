import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BillFormClient } from "@/components/BillFormClient";
import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";


export default async function EditPurchaseBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, company } = await requirePageSession();
  const { id } = await params;

  const [bill, contacts, products, terms, taxes] = await Promise.all([
    prisma.purchaseInvoice.findFirst({
      where: { id, companyId: company.id },
      include: { items: true },
    }),
    prisma.contact.findMany({
      where: { companyId: company.id, type: { contains: "vendor" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { companyId: company.id, isPurchased: true },
      select: { id: true, sku: true, name: true, unit: true, buyPrice: true },
      orderBy: { name: "asc" },
    }),
    prisma.paymentTerm.findMany({ where: { companyId: company.id }, orderBy: { days: "asc" } }),
    prisma.tax.findMany({ where: { companyId: company.id }, orderBy: { rate: "asc" } }),
  ]);

  if (!bill) notFound();

  const subtotal = Number(bill.subtotal);
  const taxTotal = Number(bill.taxTotal);
  const grandTotal = Number(bill.grandTotal);
  const computedDiscount = Math.max(0, subtotal + taxTotal - grandTotal);

  return (
    <AppShell companyName={company.name} userName={session.name} isDemo={company.isDemo}>
      <BillFormClient
        mode="edit"
        billId={bill.id}
        initialNo={bill.billNo}
        initialContactId={bill.contactId}
        initialTransDate={bill.transDate.toISOString().slice(0, 10)}
        initialDueDate={bill.dueDate.toISOString().slice(0, 10)}
        initialItems={bill.items.map((it) => ({
          productId: it.productId || "",
          description: it.description,
          qty: String(Number(it.qty)),
          unit: "pcs",
          unitCost: String(Number(it.unitCost)),
          taxRate: String(Number(it.taxRate)),
        }))}
        initialExtras={{
          extraDiscountType: "rp",
          extraDiscountValue: String(computedDiscount),
          shippingFee: "0",
          transactionFee: "0",
          withholdings: [],
          downPayment: String(Number(bill.paidAmount) || 0),
        }}
        contacts={contacts}
        products={products.map((p) => ({ ...p, buyPrice: Number(p.buyPrice) }))}
        terms={terms}
        taxes={taxes.map((t) => ({ id: t.id, name: t.name, rate: Number(t.rate) }))}
      />
    </AppShell>
  );
}
