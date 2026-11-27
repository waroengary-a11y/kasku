import { prisma } from "@/lib/prisma";
import { ChannelSettingsPayload, DEFAULT_CHANNEL_SETTINGS } from "./channel-settings";

export * from "./channel-settings";

const KEY_PREFIX = "ch_v2:";

export async function getChannelSettings(companyId: string): Promise<ChannelSettingsPayload> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { planTier: true },
  });

  const raw = company?.planTier ?? "";
  if (!raw.startsWith(KEY_PREFIX)) return DEFAULT_CHANNEL_SETTINGS;

  try {
    const parsed = JSON.parse(raw.slice(KEY_PREFIX.length));
    return {
      channels: Array.isArray(parsed.channels) && parsed.channels.length > 0 ? parsed.channels : DEFAULT_CHANNEL_SETTINGS.channels,
      schemes: Array.isArray(parsed.schemes) && parsed.schemes.length > 0 ? parsed.schemes : DEFAULT_CHANNEL_SETTINGS.schemes,
      productPrices: Array.isArray(parsed.productPrices) ? parsed.productPrices : [],
      promoPrograms: Array.isArray(parsed.promoPrograms) ? parsed.promoPrograms : [],
      strikePromos: typeof parsed.strikePromos === "object" && parsed.strikePromos ? parsed.strikePromos : {},
      variantGroups: Array.isArray(parsed.variantGroups) ? parsed.variantGroups : [],
      productVariants: typeof parsed.productVariants === "object" && parsed.productVariants ? parsed.productVariants : {},
    };
  } catch {
    return DEFAULT_CHANNEL_SETTINGS;
  }
}

export async function saveChannelSettings(companyId: string, settings: ChannelSettingsPayload) {
  await prisma.company.update({
    where: { id: companyId },
    data: { planTier: KEY_PREFIX + JSON.stringify(settings) },
  });
}
