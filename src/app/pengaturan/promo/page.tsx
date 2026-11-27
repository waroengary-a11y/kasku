import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { PromoSettingsClient } from "@/components/PromoSettingsClient";
import { getCompanyPromoSettings } from "@/lib/promo-settings";

export default async function PromoPage() {
  const { session, company } = await requirePageSession();

  const [products, promoSettings] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: company.id, isSold: true },
      select: { id: true, name: true, sku: true, unit: true, sellPrice: true },
      orderBy: { name: "asc" },
    }),
    getCompanyPromoSettings(company.id),
  ]);

  return (
    <AppShell
      companyName={company.name}
      userName={session.name}
      isDemo={company.isDemo}
    >
      <PromoSettingsClient
        initialSettings={promoSettings}
        products={products.map((p) => ({ ...p, sellPrice: Number(p.sellPrice) }))}
      />
    </AppShell>
  );
}
