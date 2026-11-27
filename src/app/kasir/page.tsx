import { requirePageSession } from "@/lib/require-page-session";
import { prisma } from "@/lib/prisma";
import { getTrialBalance } from "@/lib/accounting";
import { getChannelSettings } from "@/lib/channel-settings-server";
import { PosClient } from "@/components/PosClient";

export default async function KasirPage() {
  const { company } = await requirePageSession();

  const [products, categories, channelSettings, { rows }] = await Promise.all([
    prisma.product.findMany({
      where: { companyId: company.id, isSold: true },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.productCategory.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
    }),
    getChannelSettings(company.id),
    getTrialBalance(company.id),
  ]);

  const cashAccounts = rows
    .filter((r) => r.isCashBank)
    .map((r) => ({ id: r.id, name: r.name, balance: r.endingBalance }));

  return (
    <PosClient
      company={{ name: company.name, address: company.address, phone: company.phone }}
      products={products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        sellPrice: Number(p.sellPrice),
        buyPrice: Number(p.buyPrice),
        categoryId: p.categoryId,
        categoryName: p.category?.name || "Lainnya",
      }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      cashAccounts={cashAccounts}
      initialChannelSettings={channelSettings}
    />
  );
}
