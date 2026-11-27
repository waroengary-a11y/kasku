export interface ChannelPromoSetting {
  id: "offline" | "gofood" | "grabfood" | "shopeefood";
  name: string;
  badge: string;
  markupPct: number; // Markup harga jual ke pelanggan (%)
  appCommissionPct: number; // Potongan komisi aplikasi (%) misal GoFood 20%, GrabFood 20%, ShopeeFood 20%
}

export interface StrikePromoItem {
  productId: string;
  promoPrice: number; // Harga promo diskon coret
  active: boolean;
}

export interface TotalBillPromoSetting {
  active: boolean;
  minSpend: number; // Min. belanja
  discountType: "rp" | "pct";
  discountValue: number; // Nilai diskon
}

export interface ChannelConfigWithCommission {
  id: "offline" | "gofood" | "grabfood" | "shopeefood";
  name: string;
  badge: string;
  markupPct: number;
  appCommissionPct: number;
  colorCls: string;
}

export interface PromoSettingsPayload {
  channels: ChannelConfigWithCommission[];
  strikePromos: Record<string, number>; // productId -> promoPrice
  billPromo: TotalBillPromoSetting;
}

export const DEFAULT_PROMO_SETTINGS: PromoSettingsPayload = {
  channels: [
    { id: "offline", name: "Offline / Dine In", badge: "Dine In", markupPct: 0, appCommissionPct: 0, colorCls: "bg-slate-100 text-slate-800 border-slate-300" },
    { id: "gofood", name: "GoFood", badge: "GoFood", markupPct: 20, appCommissionPct: 20, colorCls: "bg-red-50 text-red-700 border-red-200" },
    { id: "grabfood", name: "GrabFood", badge: "GrabFood", markupPct: 20, appCommissionPct: 20, colorCls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { id: "shopeefood", name: "ShopeeFood", badge: "ShopeeFood", markupPct: 20, appCommissionPct: 20, colorCls: "bg-amber-50 text-amber-700 border-amber-200" },
  ],
  strikePromos: {},
  billPromo: {
    active: false,
    minSpend: 50000,
    discountType: "rp",
    discountValue: 5000,
  },
};
