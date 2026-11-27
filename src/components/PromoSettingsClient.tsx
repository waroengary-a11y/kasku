"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Percent,
  Save,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { PromoSettingsPayload } from "@/lib/promo-settings";

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  unit: string;
  sellPrice: number;
}

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export function PromoSettingsClient({
  initialSettings,
  products,
}: {
  initialSettings: PromoSettingsPayload;
  products: ProductRow[];
}) {
  const [settings, setSettings] = useState<PromoSettingsPayload>(initialSettings);
  const [searchProduct, setSearchProduct] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState("");

  // Handlers Komisi & Markup Channel
  function updateChannel(idx: number, field: "markupPct" | "appCommissionPct", val: number) {
    const next = [...settings.channels];
    next[idx] = { ...next[idx], [field]: Math.max(0, val) };
    setSettings({ ...settings, channels: next });
  }

  // Handlers Diskon Total Belanja
  function updateBillPromo(patch: Partial<PromoSettingsPayload["billPromo"]>) {
    setSettings({
      ...settings,
      billPromo: { ...settings.billPromo, ...patch },
    });
  }

  // Handlers Promo Coret Per Produk
  function setStrikePrice(productId: string, price: number) {
    const next = { ...settings.strikePromos };
    if (price <= 0) {
      delete next[productId];
    } else {
      next[productId] = price;
    }
    setSettings({ ...settings, strikePromos: next });
  }

  function removeStrikePrice(productId: string) {
    const next = { ...settings.strikePromos };
    delete next[productId];
    setSettings({ ...settings, strikePromos: next });
  }

  // Simpan Pengaturan
  async function handleSave() {
    setSaving(true);
    setError("");
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Gagal menyimpan pengaturan promo.");
        return;
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  }

  // Filter produk untuk pencarian promo coret
  const filteredProducts = products.filter((p) => {
    const q = searchProduct.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/pengaturan"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Kembali ke Pengaturan"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Pengaturan Promo &amp; Komisi Aplikasi</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Atur diskon coret per produk, diskon total belanja kasir, dan persentase potongan komisi aplikasi online.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 shadow-md active:scale-95 transition disabled:opacity-50"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Tersimpan!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{saving ? "Menyimpan..." : "Simpan Pengaturan"}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Bagian 1: Potongan Komisi Aplikasi & Markup Harga */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Users className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="font-bold text-slate-900 text-base">Potongan Aplikasi &amp; Markup Harga</h2>
            <p className="text-xs text-slate-500">
              Atur persentase komisi yang dipotong oleh masing-masing platform (GoFood, Grab, Shopee) serta penyesuaian markup harga jual.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings.channels.map((ch, idx) => (
            <div
              key={ch.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{ch.name}</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${ch.colorCls}`}>
                  {ch.badge}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Potongan Komisi Aplikasi */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Potongan Komisi Aplikasi
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={ch.appCommissionPct}
                      onChange={(e) => updateChannel(idx, "appCommissionPct", Number(e.target.value))}
                      className="w-full pl-3 pr-7 py-2 bg-white border border-slate-300 rounded-lg font-bold text-right text-slate-800"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Beban potongan dari pihak {ch.badge}
                  </span>
                </div>

                {/* Markup Harga Jual */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Markup Harga Menu
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={ch.markupPct}
                      onChange={(e) => updateChannel(idx, "markupPct", Number(e.target.value))}
                      className="w-full pl-3 pr-7 py-2 bg-white border border-slate-300 rounded-lg font-bold text-right text-slate-800"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Naikkan harga jual di {ch.badge}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bagian 2: Diskon Total Belanja Kasir */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="font-bold text-slate-900 text-base">Diskon Otomatis Total Belanja</h2>
              <p className="text-xs text-slate-500">
                Otomatis berikan diskon saat belanjaan di kasir mencapai minimal nominal tertentu.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.billPromo.active}
              onChange={(e) => updateBillPromo({ active: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.billPromo.active && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Minimal Belanja (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={settings.billPromo.minSpend}
                onChange={(e) => updateBillPromo({ minSpend: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Contoh: {fmtIDR(settings.billPromo.minSpend)}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Tipe Diskon
              </label>
              <select
                value={settings.billPromo.discountType}
                onChange={(e) => updateBillPromo({ discountType: e.target.value as "rp" | "pct" })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800"
              >
                <option value="rp">Nominal Rupiah (Rp)</option>
                <option value="pct">Persentase (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Nilai Diskon
              </label>
              <input
                type="number"
                min="0"
                value={settings.billPromo.discountValue}
                onChange={(e) => updateBillPromo({ discountValue: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {settings.billPromo.discountType === "rp"
                  ? `Potongan: ${fmtIDR(settings.billPromo.discountValue)}`
                  : `Potongan: ${settings.billPromo.discountValue}%`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bagian 3: Diskon Coret Menu / Produk */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-rose-500" />
            <div>
              <h2 className="font-bold text-slate-900 text-base">Diskon Coret Per Produk</h2>
              <p className="text-xs text-slate-500">
                Pasang harga coret promosi khusus untuk menu atau produk tertentu.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-200">
            {Object.keys(settings.strikePromos).length} Promo Aktif
          </span>
        </div>

        {/* Pencarian Produk */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            placeholder="Cari menu / produk untuk dipasang harga diskon coret..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        {/* Tabel / List Produk dengan Input Harga Coret */}
        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
          {filteredProducts.map((p) => {
            const hasPromo = typeof settings.strikePromos[p.id] === "number" && settings.strikePromos[p.id] > 0;
            const promoVal = settings.strikePromos[p.id] || "";

            return (
              <div
                key={p.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">{p.name}</div>
                  <div className="text-xs text-slate-400 font-mono">
                    {p.sku} · Harga Normal:{" "}
                    <span className="font-sans font-semibold text-slate-700">{fmtIDR(p.sellPrice)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Harga Promo:</span>
                    <input
                      type="number"
                      min="0"
                      value={promoVal}
                      onChange={(e) => setStrikePrice(p.id, Number(e.target.value))}
                      placeholder="Contoh: 15000"
                      className="w-32 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right text-rose-600"
                    />
                  </div>

                  {hasPromo && (
                    <button
                      type="button"
                      onClick={() => removeStrikePrice(p.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Promo Coret"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">
              Produk tidak ditemukan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
