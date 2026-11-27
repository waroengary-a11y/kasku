// ============================================================
// KASKU Channel & Promo Settings — Tipe Data Lengkap
// Disimpan di Company.planTier sebagai JSON (tidak perlu migrasi DB)
// ============================================================

// ─── 1. Konfigurasi Channel ────────────────────────────────
export const CHANNEL_IDS = ["offline", "gofood", "grabfood", "shopeefood"] as const;
export type ChannelId = (typeof CHANNEL_IDS)[number];

export const CHANNEL_META: Record<ChannelId, { name: string; badge: string; colorCls: string; emoji: string }> = {
  offline:    { name: "Offline / Dine In", badge: "Dine In",    colorCls: "bg-slate-100 text-slate-800 border-slate-300",    emoji: "🏠" },
  gofood:     { name: "GoFood",            badge: "GoFood",     colorCls: "bg-red-50 text-red-700 border-red-200",           emoji: "🛵" },
  grabfood:   { name: "GrabFood",          badge: "GrabFood",   colorCls: "bg-emerald-50 text-emerald-700 border-emerald-200", emoji: "🟢" },
  shopeefood: { name: "ShopeeFood",        badge: "ShopeeFood", colorCls: "bg-amber-50 text-amber-700 border-amber-200",     emoji: "🧡" },
};

// ─── 2. Skema Promo & Kalkulasi ─────────────────────────────
export type PromoStepType =
  | "diskon_merchant"      // Diskon ditanggung merchant
  | "diskon_platform"      // Diskon ditanggung platform (tidak mengurangi pendapatan merchant)
  | "diskon_bersama"       // Diskon ditanggung bersama (pct_merchant %)
  | "komisi_pct"           // Komisi platform (%)
  | "biaya_tetap"          // Biaya tetap per order (Rp)
  | "subsidi_ongkir"       // Subsidi ongkir yang ditanggung merchant

export interface PromoStep {
  type: PromoStepType;
  label: string;
  /** Untuk diskon_bersama: berapa % yang ditanggung merchant (0-100) */
  merchantPct?: number;
}

/** Template skema perhitungan – bisa dibuat berkali-kali */
export interface CalcScheme {
  id: string;             // cuid lokal, dibuat di client
  name: string;           // "Skema A — Diskon + Komisi", dll
  steps: PromoStep[];     // Urutan langkah kalkulasi
}

// ─── 3. Konfigurasi Komisi Per Channel ─────────────────────
export interface ChannelCommission {
  channelId: ChannelId;
  commissionPct: number;    // Komisi (%)
  fixedFeePerOrder: number; // Biaya tetap (Rp/order)
  commissionBase: "after_discount" | "before_discount"; // Dasar pengenaan komisi
  defaultSchemeId: string;  // Skema perhitungan default untuk channel ini
  markupPct: number;        // Markup harga global (%)
}

// ─── 4. Harga Khusus Per Produk Per Channel ─────────────────
export interface ProductChannelPrice {
  productId: string;
  channelId: ChannelId;
  price: number; // Harga khusus; 0 = pakai harga dasar + markup global
  fixedCommissionRp?: number; // Potongan tetap khusus per porsi (Rp); > 0 menggantikan komisi % channel
}

// ─── 5. Program Promo ───────────────────────────────────────
export type PromoDiscountType = "rp" | "pct";
export type DiscountBearer = "merchant" | "platform" | "bersama";

export interface PromoProgram {
  id: string;
  name: string;
  active: boolean;
  channelIds: ChannelId[];  // Berlaku di channel mana saja
  schemeId: string;         // Skema kalkulasi yang digunakan
  // Diskon Coret
  strikeDiscountType: PromoDiscountType;
  strikeDiscountValue: number;
  strikeBearer: DiscountBearer;
  strikeMerchantPct: number; // jika bersama, berapa % merchant
  // Diskon Total
  billPromoActive: boolean;
  billMinSpend: number;
  billDiscountType: PromoDiscountType;
  billDiscountValue: number;
  billBearer: DiscountBearer;
  // Subsidi ongkir
  deliverySubsidyRp: number;
}

// ─── 6. Payload Utama (disimpan di DB) ───────────────────────
export interface ChannelSettingsPayload {
  channels: ChannelCommission[];
  schemes: CalcScheme[];
  productPrices: ProductChannelPrice[];  // Harga khusus per produk per channel
  promoPrograms: PromoProgram[];
  strikePromos: Record<string, number>;  // productId -> harga coret global (backward compat)
}

// ─── 7. Default Values ────────────────────────────────────────
export const DEFAULT_SCHEME_ID = "scheme-default-a";
export const DEFAULT_SCHEME_B_ID = "scheme-default-b";
export const DEFAULT_SCHEME_C_ID = "scheme-default-c";

export const DEFAULT_SCHEMES: CalcScheme[] = [
  {
    id: DEFAULT_SCHEME_ID,
    name: "Skema A — Diskon + Komisi + Subsidi Ongkir",
    steps: [
      { type: "diskon_merchant", label: "Dikurangi diskon merchant" },
      { type: "komisi_pct", label: "Dikurangi komisi aplikasi" },
      { type: "biaya_tetap", label: "Dikurangi biaya tetap" },
      { type: "subsidi_ongkir", label: "Dikurangi subsidi ongkir merchant" },
    ],
  },
  {
    id: DEFAULT_SCHEME_B_ID,
    name: "Skema B — Diskon dahulu, lalu Komisi",
    steps: [
      { type: "diskon_merchant", label: "Dikurangi diskon merchant" },
      { type: "komisi_pct", label: "Dikurangi komisi aplikasi" },
    ],
  },
  {
    id: DEFAULT_SCHEME_C_ID,
    name: "Skema C — Komisi dahulu, lalu Diskon",
    steps: [
      { type: "komisi_pct", label: "Dikurangi komisi aplikasi" },
      { type: "diskon_merchant", label: "Dikurangi diskon merchant" },
    ],
  },
];

export const DEFAULT_CHANNEL_SETTINGS: ChannelSettingsPayload = {
  channels: [
    { channelId: "offline",    commissionPct: 0,  fixedFeePerOrder: 0, commissionBase: "after_discount", defaultSchemeId: DEFAULT_SCHEME_B_ID, markupPct: 0 },
    { channelId: "gofood",     commissionPct: 20, fixedFeePerOrder: 0, commissionBase: "after_discount", defaultSchemeId: DEFAULT_SCHEME_ID,   markupPct: 0 },
    { channelId: "grabfood",   commissionPct: 20, fixedFeePerOrder: 0, commissionBase: "after_discount", defaultSchemeId: DEFAULT_SCHEME_ID,   markupPct: 0 },
    { channelId: "shopeefood", commissionPct: 20, fixedFeePerOrder: 0, commissionBase: "after_discount", defaultSchemeId: DEFAULT_SCHEME_ID,   markupPct: 0 },
  ],
  schemes: DEFAULT_SCHEMES,
  productPrices: [],
  promoPrograms: [],
  strikePromos: {},
};

// ─── 8. Fungsi Kalkulasi Net Revenue ──────────────────────────
export interface CalcInput {
  grossPrice: number;       // Harga jual produk di channel
  merchantDiscount: number; // Diskon yang ditanggung merchant (Rp)
  platformDiscount: number; // Diskon yang ditanggung platform (tidak mengurangi net)
  deliverySubsidy: number;  // Subsidi ongkir (Rp)
  hpp: number;              // Harga Pokok Penjualan
}

export interface CalcOutput {
  grossPrice: number;
  merchantDiscount: number;
  platformDiscount: number;
  commissionBase: number;      // Harga setelah diskon sebelum komisi atau sebaliknya
  commissionAmount: number;    // Jumlah komisi (Rp)
  fixedFee: number;
  deliverySubsidy: number;
  netRevenue: number;          // Penerimaan bersih
  hpp: number;
  profit: number;
  marginPct: number;
  steps: Array<{ label: string; amount: number; running: number }>;
}

export function calculateNetRevenue(
  input: CalcInput,
  channel: ChannelCommission,
  scheme: CalcScheme
): CalcOutput {
  let running = input.grossPrice;
  const stepLog: Array<{ label: string; amount: number; running: number }> = [
    { label: "Total harga produk", amount: input.grossPrice, running },
  ];

  let commissionAmount = 0;
  let commissionBase = input.grossPrice;
  let subsidyApplied = false;

  for (const step of scheme.steps) {
    if (step.type === "diskon_merchant" && input.merchantDiscount > 0) {
      running -= input.merchantDiscount;
      stepLog.push({ label: "Dikurangi diskon merchant", amount: -input.merchantDiscount, running });
    } else if (step.type === "komisi_pct") {
      // Dasar komisi berdasarkan konfigurasi channel
      commissionBase = running;
      commissionAmount = Math.round((running * channel.commissionPct) / 100);
      running -= commissionAmount;
      stepLog.push({ label: `Komisi aplikasi (${channel.commissionPct}%)`, amount: -commissionAmount, running });
    } else if (step.type === "biaya_tetap" && channel.fixedFeePerOrder > 0) {
      running -= channel.fixedFeePerOrder;
      stepLog.push({ label: "Biaya tetap per order", amount: -channel.fixedFeePerOrder, running });
    } else if (step.type === "subsidi_ongkir" && input.deliverySubsidy > 0) {
      running -= input.deliverySubsidy;
      subsidyApplied = true;
      stepLog.push({ label: "Subsidi ongkir merchant", amount: -input.deliverySubsidy, running });
    }
    // diskon_platform & diskon_bersama ditanggung platform, tidak mengurangi running
  }

  if (!subsidyApplied && input.deliverySubsidy > 0) {
    running -= input.deliverySubsidy;
    stepLog.push({ label: "Subsidi ongkir merchant", amount: -input.deliverySubsidy, running });
  }

  const netRevenue = running;
  const profit = netRevenue - input.hpp;
  const marginPct = input.grossPrice > 0 ? (profit / input.grossPrice) * 100 : 0;

  stepLog.push({ label: "Penerimaan bersih", amount: netRevenue, running: netRevenue });

  return {
    grossPrice: input.grossPrice,
    merchantDiscount: input.merchantDiscount,
    platformDiscount: input.platformDiscount,
    commissionBase,
    commissionAmount,
    fixedFee: channel.fixedFeePerOrder,
    deliverySubsidy: input.deliverySubsidy,
    netRevenue,
    hpp: input.hpp,
    profit,
    marginPct,
    steps: stepLog,
  };
}

/** Ambil harga produk di channel tertentu (custom atau markup global) */
export function getProductPriceForChannel(
  basePrice: number,
  productId: string,
  channelId: ChannelId,
  settings: ChannelSettingsPayload
): number {
  const custom = settings.productPrices.find(
    (pp) => pp.productId === productId && pp.channelId === channelId && pp.price > 0
  );
  if (custom) return custom.price;

  const ch = settings.channels.find((c) => c.channelId === channelId);
  if (ch && ch.markupPct > 0) {
    return Math.round(basePrice * (1 + ch.markupPct / 100));
  }
  return basePrice;
}

/** Ambil potongan tetap khusus per porsi untuk produk di channel tertentu (0 = ikut aturan % global) */
export function getProductFixedCommission(
  productId: string,
  channelId: ChannelId,
  settings: ChannelSettingsPayload
): number {
  const custom = settings.productPrices.find(
    (pp) => pp.productId === productId && pp.channelId === channelId
  );
  return custom?.fixedCommissionRp && custom.fixedCommissionRp > 0 ? custom.fixedCommissionRp : 0;
}

export interface CartCalcItem {
  productId: string;
  qty: number;
  lineNet: number; // total harga item setelah diskon item
}

/**
 * Kalkulasi penerimaan bersih dengan mendukung campuran:
 * - Item normal: kena komisi % global channel
 * - Item khusus (fixedCommissionRp > 0): kena potongan tetap Rp/porsi, tidak kena komisi % global
 */
export function calculateCartNetRevenue(
  items: CartCalcItem[],
  merchantDiscount: number,
  deliverySubsidy: number,
  channel: ChannelCommission,
  scheme: CalcScheme,
  settings: ChannelSettingsPayload
): CalcOutput & { pctCommissionAmount: number; specialCommissionAmount: number } {
  let normalGross = 0;
  let specialGross = 0;
  let specialCommissionTotal = 0;

  for (const it of items) {
    const fixedPerQty = getProductFixedCommission(it.productId, channel.channelId, settings);
    if (fixedPerQty > 0) {
      specialGross += it.lineNet;
      specialCommissionTotal += fixedPerQty * it.qty;
    } else {
      normalGross += it.lineNet;
    }
  }

  const totalGross = normalGross + specialGross;
  let running = totalGross;
  let discountApplied = false;
  let komisiApplied = false;
  let subsidyApplied = false;
  let pctCommissionAmount = 0;
  let appliedFixedFee = 0;
  let commissionBase = totalGross;

  const stepLog: Array<{ label: string; amount: number; running: number }> = [
    { label: "Total harga produk", amount: totalGross, running },
  ];

  for (const step of scheme.steps) {
    if (step.type === "diskon_merchant" && merchantDiscount > 0) {
      running -= merchantDiscount;
      discountApplied = true;
      stepLog.push({ label: "Dikurangi diskon merchant", amount: -merchantDiscount, running });
    } else if (step.type === "komisi_pct") {
      komisiApplied = true;
      // Hanya item normal yang kena komisi %
      const normalBase = discountApplied
        ? Math.max(0, normalGross - merchantDiscount)
        : normalGross;
      commissionBase = normalBase;
      pctCommissionAmount = Math.round((normalBase * channel.commissionPct) / 100);
      const totalStepComm = pctCommissionAmount + specialCommissionTotal;
      running -= totalStepComm;
      stepLog.push({
        label: specialCommissionTotal > 0
          ? `Komisi (${channel.commissionPct}%) + Pot. Khusus`
          : `Komisi aplikasi (${channel.commissionPct}%)`,
        amount: -totalStepComm,
        running,
      });
    } else if (step.type === "biaya_tetap" && channel.fixedFeePerOrder > 0 && normalGross > 0) {
      appliedFixedFee = channel.fixedFeePerOrder;
      running -= appliedFixedFee;
      stepLog.push({ label: "Biaya tetap per order", amount: -appliedFixedFee, running });
    } else if (step.type === "subsidi_ongkir" && deliverySubsidy > 0) {
      running -= deliverySubsidy;
      subsidyApplied = true;
      stepLog.push({ label: "Subsidi ongkir merchant", amount: -deliverySubsidy, running });
    }
  }

  if (!komisiApplied && specialCommissionTotal > 0) {
    running -= specialCommissionTotal;
    stepLog.push({ label: "Potongan tetap khusus produk", amount: -specialCommissionTotal, running });
  }

  if (!subsidyApplied && deliverySubsidy > 0) {
    running -= deliverySubsidy;
    stepLog.push({ label: "Subsidi ongkir merchant", amount: -deliverySubsidy, running });
  }

  const commissionAmount = pctCommissionAmount + specialCommissionTotal;
  const netRevenue = running;

  stepLog.push({ label: "Penerimaan bersih", amount: netRevenue, running: netRevenue });

  return {
    grossPrice: totalGross,
    merchantDiscount,
    platformDiscount: 0,
    commissionBase,
    commissionAmount,
    pctCommissionAmount,
    specialCommissionAmount: specialCommissionTotal,
    fixedFee: appliedFixedFee,
    deliverySubsidy,
    netRevenue,
    hpp: 0,
    profit: netRevenue,
    marginPct: totalGross > 0 ? (netRevenue / totalGross) * 100 : 0,
    steps: stepLog,
  };
}
