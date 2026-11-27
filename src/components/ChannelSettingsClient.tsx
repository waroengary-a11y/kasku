"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft, Check, ChevronDown, ChevronRight, GripVertical, Info,
  Percent, Plus, Save, Search, Settings2, Sparkles, Tag, Trash2, TrendingDown, Zap,
} from "lucide-react";
import Link from "next/link";
import {
  ChannelSettingsPayload, ChannelCommission, CalcScheme, PromoStep,
  PromoStepType, ChannelId, CHANNEL_IDS, CHANNEL_META,
  calculateNetRevenue, DEFAULT_CHANNEL_SETTINGS, DEFAULT_SCHEMES,
  getProductPriceForChannel,
} from "@/lib/channel-settings";

interface ProductRow {
  id: string; sku: string; name: string; unit: string;
  sellPrice: number; buyPrice: number; categoryName: string;
}

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const STEP_TYPE_OPTIONS: { value: PromoStepType; label: string; desc: string }[] = [
  { value: "diskon_merchant",  label: "Diskon Merchant",    desc: "Diskon ditanggung merchant, mengurangi penerimaan" },
  { value: "diskon_platform",  label: "Diskon Platform",    desc: "Ditanggung platform, TIDAK mengurangi penerimaan merchant" },
  { value: "diskon_bersama",   label: "Diskon Bersama",     desc: "Sebagian ditanggung merchant, sebagian platform" },
  { value: "komisi_pct",       label: "Komisi Aplikasi (%)", desc: "Potongan persentase komisi platform" },
  { value: "biaya_tetap",      label: "Biaya Tetap (Rp)",   desc: "Biaya tetap per transaksi (Rp)" },
  { value: "subsidi_ongkir",   label: "Subsidi Ongkir",     desc: "Subsidi ongkir yang ditanggung merchant" },
];

function nanoid6() {
  return Math.random().toString(36).slice(2, 8);
}

export function ChannelSettingsClient({
  initialSettings,
  products,
}: {
  initialSettings: ChannelSettingsPayload;
  products: ProductRow[];
}) {
  const [settings, setSettings] = useState<ChannelSettingsPayload>(initialSettings);
  const [activeTab, setActiveTab] = useState<"channels" | "prices" | "schemes" | "promo" | "simulator">("channels");
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);

  // Simulator state
  const [simChannel, setSimChannel] = useState<ChannelId>("gofood");
  const [simSchemeId, setSimSchemeId] = useState(DEFAULT_SCHEMES[0].id);
  const [simGross, setSimGross] = useState(16000);
  const [simMerchantDisc, setSimMerchantDisc] = useState(2000);
  const [simPlatformDisc, setSimPlatformDisc] = useState(0);
  const [simDeliverySubsidy, setSimDeliverySubsidy] = useState(1000);
  const [simHpp, setSimHpp] = useState(7500);

  async function handleSave() {
    setSaving(true); setError(""); setSavedOk(false);
    try {
      const res = await fetch("/api/channel-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Gagal menyimpan."); return;
      }
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } catch { setError("Kesalahan jaringan."); }
    finally { setSaving(false); }
  }

  // ── Channel Handlers ──────────────────────────────────────────────
  function updateChannel(idx: number, patch: Partial<ChannelCommission>) {
    const next = [...settings.channels];
    next[idx] = { ...next[idx], ...patch };
    setSettings({ ...settings, channels: next });
  }

  // ── Scheme Handlers ──────────────────────────────────────────────
  function addScheme() {
    const id = "scheme-" + nanoid6();
    const newScheme: CalcScheme = {
      id, name: "Skema Baru",
      steps: [
        { type: "diskon_merchant", label: "Dikurangi diskon merchant" },
        { type: "komisi_pct", label: "Dikurangi komisi aplikasi" },
      ],
    };
    setSettings({ ...settings, schemes: [...settings.schemes, newScheme] });
    setExpandedScheme(id);
  }

  function updateScheme(id: string, patch: Partial<CalcScheme>) {
    setSettings({
      ...settings,
      schemes: settings.schemes.map((s) => s.id === id ? { ...s, ...patch } : s),
    });
  }

  function deleteScheme(id: string) {
    if (!confirm("Hapus skema ini?")) return;
    setSettings({ ...settings, schemes: settings.schemes.filter((s) => s.id !== id) });
  }

  function addStep(schemeId: string, type: PromoStepType) {
    const opt = STEP_TYPE_OPTIONS.find((o) => o.value === type)!;
    const newStep: PromoStep = { type, label: opt.label };
    setSettings({
      ...settings,
      schemes: settings.schemes.map((s) =>
        s.id === schemeId ? { ...s, steps: [...s.steps, newStep] } : s
      ),
    });
  }

  function removeStep(schemeId: string, idx: number) {
    setSettings({
      ...settings,
      schemes: settings.schemes.map((s) =>
        s.id === schemeId ? { ...s, steps: s.steps.filter((_, i) => i !== idx) } : s
      ),
    });
  }

  // ── Product Prices Handlers ───────────────────────────────────────
  function setProductChannelPrice(productId: string, channelId: ChannelId, price: number) {
    const existing = settings.productPrices.filter(
      (pp) => !(pp.productId === productId && pp.channelId === channelId)
    );
    const next = price > 0
      ? [...existing, { productId, channelId, price }]
      : existing;
    setSettings({ ...settings, productPrices: next });
  }

  function getProductPrice(productId: string, channelId: ChannelId): number {
    const pp = settings.productPrices.find(
      (p) => p.productId === productId && p.channelId === channelId
    );
    return pp?.price ?? 0;
  }

  // ── Strike Promo Handlers ─────────────────────────────────────────
  function setStrikePrice(productId: string, price: number) {
    const next = { ...settings.strikePromos };
    if (price <= 0) delete next[productId]; else next[productId] = price;
    setSettings({ ...settings, strikePromos: next });
  }

  // ── Simulator ────────────────────────────────────────────────────
  const simResult = useMemo(() => {
    const ch = settings.channels.find((c) => c.channelId === simChannel) ??
      DEFAULT_CHANNEL_SETTINGS.channels.find((c) => c.channelId === simChannel)!;
    const schemeId = simSchemeId || ch.defaultSchemeId;
    const scheme = settings.schemes.find((s) => s.id === schemeId) ??
      DEFAULT_SCHEMES[0];
    return calculateNetRevenue(
      { grossPrice: simGross, merchantDiscount: simMerchantDisc, platformDiscount: simPlatformDisc, deliverySubsidy: simDeliverySubsidy, hpp: simHpp },
      ch, scheme
    );
  }, [settings, simChannel, simSchemeId, simGross, simMerchantDisc, simPlatformDisc, simDeliverySubsidy, simHpp]);

  const filteredProducts = useMemo(() => {
    const q = searchProduct.trim().toLowerCase();
    return !q ? products : products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, searchProduct]);

  const TABS = [
    { id: "channels", label: "Komisi & Markup", icon: <Settings2 className="w-4 h-4" /> },
    { id: "prices",   label: "Harga Per Channel", icon: <Tag className="w-4 h-4" /> },
    { id: "schemes",  label: "Skema Perhitungan", icon: <Zap className="w-4 h-4" /> },
    { id: "promo",    label: "Diskon & Promo", icon: <Sparkles className="w-4 h-4" /> },
    { id: "simulator", label: "Simulator", icon: <TrendingDown className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/pengaturan" className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Pengaturan Penjualan & Channel</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-8">
            Harga per platform, komisi, skema perhitungan, program promo, dan simulasi keuntungan.
          </p>
        </div>
        <button
          type="button" onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md active:scale-95 transition disabled:opacity-50"
        >
          {savedOk ? <><Check className="w-4 h-4 stroke-[3]" /><span>Tersimpan!</span></> : <><Save className="w-4 h-4" /><span>{saving ? "Menyimpan..." : "Simpan"}</span></>}
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === t.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1: KOMISI & MARKUP PER CHANNEL
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "channels" && (
        <div className="space-y-4">
          {settings.channels.map((ch, idx) => {
            const meta = CHANNEL_META[ch.channelId];
            const schemes = settings.schemes;
            return (
              <div key={ch.channelId} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.emoji}</span>
                  <div>
                    <div className="font-bold text-slate-900">{meta.name}</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.colorCls}`}>{meta.badge}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Komisi % */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Komisi (%)</label>
                    <div className="relative">
                      <input type="number" min="0" max="100" step="0.1"
                        value={ch.commissionPct}
                        onChange={(e) => updateChannel(idx, { commissionPct: parseFloat(e.target.value) || 0 })}
                        className="w-full pr-8 pl-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-right"
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  {/* Biaya Tetap */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Biaya Tetap (Rp/order)</label>
                    <input type="number" min="0"
                      value={ch.fixedFeePerOrder}
                      onChange={(e) => updateChannel(idx, { fixedFeePerOrder: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                  {/* Markup Global % */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Markup Harga (%)</label>
                    <div className="relative">
                      <input type="number" min="0" max="200" step="0.1"
                        value={ch.markupPct}
                        onChange={(e) => updateChannel(idx, { markupPct: parseFloat(e.target.value) || 0 })}
                        className="w-full pr-8 pl-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-right"
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <span className="text-[10px] text-slate-400">Default jika harga khusus belum ada</span>
                  </div>
                  {/* Dasar Komisi */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Dasar Pengenaan Komisi</label>
                    <select
                      value={ch.commissionBase}
                      onChange={(e) => updateChannel(idx, { commissionBase: e.target.value as "after_discount" | "before_discount" })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                    >
                      <option value="after_discount">Harga setelah diskon</option>
                      <option value="before_discount">Harga sebelum diskon</option>
                    </select>
                  </div>
                </div>

                {/* Skema Default */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Skema Perhitungan Default</label>
                  <select
                    value={ch.defaultSchemeId}
                    onChange={(e) => updateChannel(idx, { defaultSchemeId: e.target.value })}
                    className="w-full md:w-80 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                  >
                    {schemes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Preview net revenue */}
                {ch.commissionPct > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-200">
                    <span className="font-semibold">Contoh:</span> Harga jual Rp 20.000 →{" "}
                    Komisi {ch.commissionPct}% = {fmtIDR(Math.round(20000 * ch.commissionPct / 100))}{" "}
                    + Biaya tetap {fmtIDR(ch.fixedFeePerOrder)} →{" "}
                    <span className="font-bold text-emerald-700">Net ~{fmtIDR(20000 - Math.round(20000 * ch.commissionPct / 100) - ch.fixedFeePerOrder)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2: HARGA PER CHANNEL PER PRODUK
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "prices" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-2 text-xs text-blue-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Kosongkan / isi 0 untuk menggunakan <strong>harga dasar + markup global channel</strong>. Isi harga khusus untuk override per produk.</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              placeholder="Cari produk / menu..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Header */}
            <div className="grid text-[11px] font-bold text-slate-500 uppercase tracking-wide bg-slate-50 px-4 py-2.5 border-b border-slate-200"
              style={{ gridTemplateColumns: "1fr repeat(4, 120px)" }}>
              <div>Produk</div>
              {CHANNEL_IDS.map((cid) => (
                <div key={cid} className="text-center">{CHANNEL_META[cid].emoji} {CHANNEL_META[cid].badge}</div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-400">Produk tidak ditemukan.</div>
            )}

            {filteredProducts.map((p) => (
              <div key={p.id}
                className="grid items-center gap-2 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition"
                style={{ gridTemplateColumns: "1fr repeat(4, 120px)" }}>
                <div>
                  <div className="font-semibold text-slate-900 text-sm truncate">{p.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{p.sku} · Normal: <span className="font-sans font-semibold text-slate-600">{fmtIDR(p.sellPrice)}</span></div>
                </div>
                {CHANNEL_IDS.map((cid) => {
                  const val = getProductPrice(p.id, cid);
                  const effective = getProductPriceForChannel(p.sellPrice, p.id, cid, settings);
                  const ch = settings.channels.find((c) => c.channelId === cid);
                  return (
                    <div key={cid} className="text-center">
                      <input
                        type="number" min="0"
                        value={val || ""}
                        onChange={(e) => setProductChannelPrice(p.id, cid, parseInt(e.target.value) || 0)}
                        placeholder={String(effective)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      {ch && ch.markupPct > 0 && !val && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          +{ch.markupPct}% → {fmtIDR(effective)}
                        </div>
                      )}
                      {val > 0 && (
                        <div className={`text-[10px] mt-0.5 font-semibold ${val < p.sellPrice ? "text-rose-500" : "text-emerald-600"}`}>
                          {fmtPct(((val - p.sellPrice) / p.sellPrice) * 100)} dari normal
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 3: SKEMA PERHITUNGAN
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "schemes" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2 text-xs text-amber-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Skema menentukan <strong>urutan potongan</strong>. Urutan berbeda menghasilkan penerimaan bersih yang berbeda. Diskon yang ditanggung <em>platform</em> tidak mengurangi pendapatan merchant.</span>
          </div>

          {settings.schemes.map((scheme) => (
            <div key={scheme.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setExpandedScheme(expandedScheme === scheme.id ? null : scheme.id)}
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <div>
                    <input
                      type="text"
                      value={scheme.name}
                      onChange={(e) => { e.stopPropagation(); updateScheme(scheme.id, { name: e.target.value }); }}
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none w-72"
                    />
                    <div className="text-xs text-slate-400 mt-0.5">{scheme.steps.length} langkah kalkulasi</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteScheme(scheme.id); }}
                    className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedScheme === scheme.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {expandedScheme === scheme.id && (
                <div className="border-t border-slate-100 p-4 space-y-3">
                  {/* Steps */}
                  <div className="space-y-2">
                    {scheme.steps.map((step, si) => (
                      <div key={si} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        <div className="flex-1">
                          <select
                            value={step.type}
                            onChange={(e) => {
                              const type = e.target.value as PromoStepType;
                              const opt = STEP_TYPE_OPTIONS.find((o) => o.value === type)!;
                              const updated = scheme.steps.map((s, i) => i === si ? { ...s, type, label: opt.label } : s);
                              updateScheme(scheme.id, { steps: updated });
                            }}
                            className="text-sm font-semibold text-slate-700 bg-transparent border-0 focus:outline-none w-full"
                          >
                            {STEP_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <div className="text-[10px] text-slate-400">
                            {STEP_TYPE_OPTIONS.find((o) => o.value === step.type)?.desc}
                          </div>
                        </div>
                        <button
                          onClick={() => removeStep(scheme.id, si)}
                          className="p-1 text-slate-300 hover:text-rose-500 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Tambah Step */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {STEP_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => addStep(scheme.id, opt.value)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
                      >
                        <Plus className="w-3 h-3" /> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addScheme}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 text-sm font-semibold transition w-full justify-center"
          >
            <Plus className="w-4 h-4" /> Tambah Skema Perhitungan Baru
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 4: DISKON & PROMO (Harga Coret)
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "promo" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Tag className="w-5 h-5 text-rose-500" />
              <div>
                <h2 className="font-bold text-slate-900">Harga Coret Per Produk</h2>
                <p className="text-xs text-slate-500">Harga promo yang ditampilkan di kasir (semua channel).</p>
              </div>
              <span className="ml-auto text-xs font-semibold bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-200">
                {Object.keys(settings.strikePromos).length} aktif
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={searchProduct} onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Cari produk..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600" />
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {filteredProducts.map((p) => {
                const promoVal = settings.strikePromos[p.id] || "";
                const hasPromo = Number(promoVal) > 0;
                return (
                  <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{p.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{p.sku} · Normal: <span className="font-sans font-semibold text-slate-700">{fmtIDR(p.sellPrice)}</span></div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-500">Harga Promo:</span>
                      <input type="number" min="0" value={promoVal}
                        onChange={(e) => setStrikePrice(p.id, Number(e.target.value))}
                        placeholder="0"
                        className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right text-rose-600" />
                      {hasPromo && (
                        <button onClick={() => setStrikePrice(p.id, 0)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Produk tidak ditemukan.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 5: SIMULATOR KEUNTUNGAN
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Input */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <TrendingDown className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-900">Input Simulasi</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Channel</label>
                <select value={simChannel} onChange={(e) => setSimChannel(e.target.value as ChannelId)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-sm">
                  {CHANNEL_IDS.map((cid) => <option key={cid} value={cid}>{CHANNEL_META[cid].name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Skema Perhitungan</label>
                <select value={simSchemeId} onChange={(e) => setSimSchemeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-sm">
                  {settings.schemes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {[
              { label: "Harga Jual (Rp)", val: simGross, set: setSimGross },
              { label: "Diskon Merchant (Rp)", val: simMerchantDisc, set: setSimMerchantDisc },
              { label: "Diskon Platform (Rp)", val: simPlatformDisc, set: setSimPlatformDisc },
              { label: "Subsidi Ongkir Merchant (Rp)", val: simDeliverySubsidy, set: setSimDeliverySubsidy },
              { label: "HPP / Cost (Rp)", val: simHpp, set: setSimHpp },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                <input type="number" min="0" value={val}
                  onChange={(e) => set(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" />
              </div>
            ))}
          </div>

          {/* Output */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900">Hasil Kalkulasi</h2>
            </div>

            <div className="space-y-1">
              {simResult.steps.map((step, i) => {
                const isFirst = i === 0;
                const isLast = i === simResult.steps.length - 1;
                return (
                  <div key={i} className={`flex justify-between items-center py-2 px-3 rounded-lg text-sm ${isLast ? "bg-emerald-50 border border-emerald-200 font-bold" : isFirst ? "bg-slate-50 border border-slate-200 font-semibold" : "border border-transparent"}`}>
                    <span className={isLast ? "text-emerald-700" : "text-slate-600"}>{step.label}</span>
                    <span className={`font-bold ${step.amount < 0 ? "text-rose-600" : isLast ? "text-emerald-700 text-base" : "text-slate-800"}`}>
                      {step.amount < 0 ? `− ${fmtIDR(-step.amount)}` : fmtIDR(step.amount)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">HPP / Cost</span>
                <span className="font-bold text-slate-800">− {fmtIDR(simResult.hpp)}</span>
              </div>
              <div className={`flex justify-between text-sm font-bold p-2.5 rounded-lg ${simResult.profit >= 0 ? "bg-blue-50 text-blue-800" : "bg-rose-50 text-rose-700"}`}>
                <span>Keuntungan</span>
                <span>{fmtIDR(simResult.profit)}</span>
              </div>
              <div className="text-xs text-slate-500 text-right">
                Margin terhadap harga jual: <strong className={simResult.marginPct >= 0 ? "text-blue-600" : "text-rose-600"}>{simResult.marginPct.toFixed(2)}%</strong>
              </div>
            </div>

            {/* Breakdown jurnal */}
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Jurnal Akuntansi</div>
              <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600">Keterangan</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td className="px-3 py-2 text-slate-700">Penjualan bruto</td><td className="px-3 py-2 text-right font-semibold text-slate-900">{fmtIDR(simResult.grossPrice)}</td></tr>
                    {simResult.merchantDiscount > 0 && <tr><td className="px-3 py-2 text-rose-600">Diskon penjualan</td><td className="px-3 py-2 text-right font-semibold text-rose-600">({fmtIDR(simResult.merchantDiscount)})</td></tr>}
                    {simResult.commissionAmount > 0 && <tr><td className="px-3 py-2 text-rose-600">Beban komisi aplikasi</td><td className="px-3 py-2 text-right font-semibold text-rose-600">({fmtIDR(simResult.commissionAmount)})</td></tr>}
                    {simResult.fixedFee > 0 && <tr><td className="px-3 py-2 text-rose-600">Beban administrasi</td><td className="px-3 py-2 text-right font-semibold text-rose-600">({fmtIDR(simResult.fixedFee)})</td></tr>}
                    {simResult.deliverySubsidy > 0 && <tr><td className="px-3 py-2 text-rose-600">Beban subsidi ongkir</td><td className="px-3 py-2 text-right font-semibold text-rose-600">({fmtIDR(simResult.deliverySubsidy)})</td></tr>}
                    <tr className="bg-blue-50"><td className="px-3 py-2 font-bold text-blue-800">Piutang platform</td><td className="px-3 py-2 text-right font-bold text-blue-800">{fmtIDR(simResult.netRevenue)}</td></tr>
                    {simResult.hpp > 0 && <tr><td className="px-3 py-2 text-rose-600">HPP</td><td className="px-3 py-2 text-right font-semibold text-rose-600">({fmtIDR(simResult.hpp)})</td></tr>}
                    <tr className={`${simResult.profit >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                      <td className={`px-3 py-2 font-bold ${simResult.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>Keuntungan</td>
                      <td className={`px-3 py-2 text-right font-bold ${simResult.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{fmtIDR(simResult.profit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Ketika uang dari platform masuk, kurangi Piutang Platform — bukan catat penjualan baru.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
