import { prisma } from "@/lib/prisma";
import { DEFAULT_PROMO_SETTINGS, PromoSettingsPayload } from "./promo-types";

export * from "./promo-types";

export async function getCompanyPromoSettings(companyId: string): Promise<PromoSettingsPayload> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { planTier: true },
  });

  if (!company?.planTier || !company.planTier.startsWith("{")) {
    return DEFAULT_PROMO_SETTINGS;
  }

  try {
    const parsed = JSON.parse(company.planTier);
    return {
      channels: Array.isArray(parsed.channels) && parsed.channels.length > 0 ? parsed.channels : DEFAULT_PROMO_SETTINGS.channels,
      strikePromos: typeof parsed.strikePromos === "object" && parsed.strikePromos ? parsed.strikePromos : {},
      billPromo: parsed.billPromo ? { ...DEFAULT_PROMO_SETTINGS.billPromo, ...parsed.billPromo } : DEFAULT_PROMO_SETTINGS.billPromo,
    };
  } catch {
    return DEFAULT_PROMO_SETTINGS;
  }
}

export async function saveCompanyPromoSettings(companyId: string, settings: PromoSettingsPayload) {
  const jsonStr = JSON.stringify(settings);
  await prisma.company.update({
    where: { id: companyId },
    data: { planTier: jsonStr },
  });
}
