import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";
import { getChannelSettings } from "@/lib/channel-settings-server";
import { ChannelSettingsClient } from "@/components/ChannelSettingsClient";

export default async function PengaturanPromoPage() {
  const { company } = await requirePageSession();

  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: company.id, isSold: true },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    getChannelSettings(company.id),
  ]);

  return (
    <ChannelSettingsClient
      initialSettings={settings}
      products={products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        sellPrice: Number(p.sellPrice),
        buyPrice: Number(p.buyPrice),
        categoryName: p.category?.name ?? "Lainnya",
      }))}
    />
  );
}
