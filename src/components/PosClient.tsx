"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  Percent,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  Users,
} from "lucide-react";

import {
  ChannelSettingsPayload, DEFAULT_CHANNEL_SETTINGS, ChannelId,
  CHANNEL_META, CHANNEL_IDS, getProductPriceForChannel,
  getProductFixedCommission, calculateCartNetRevenue, DEFAULT_SCHEMES,
} from "@/lib/channel-settings";

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  sellPrice: number;
  buyPrice: number;
  categoryId: string | null;
  categoryName: string;
}

interface CartItem {
  product: ProductItem;
  qty: number;
  discountPct: number;
  customPrice?: number; // Override harga jika diubah kasir
}

interface CashAccount {
  id: string;
  name: string;
  balance: number;
}

export type CustomerChannel = ChannelId;

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export function PosClient({
  company,
  products,
  categories,
  cashAccounts,
  initialChannelSettings,
}: {
  company: { name: string; address: string | null; phone: string | null };
  products: ProductItem[];
  categories: { id: string; name: string }[];
  cashAccounts: CashAccount[];
  initialChannelSettings?: ChannelSettingsPayload;
}) {
  const channelSettings = initialChannelSettings ?? DEFAULT_CHANNEL_SETTINGS;

  const [channel, setChannel] = useState<ChannelId>("offline");
  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCashId, setSelectedCashId] = useState(cashAccounts[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [extraDiscountTotal, setExtraDiscountTotal] = useState<number>(0);
  const [deliverySubsidy, setDeliverySubsidy] = useState<number>(0);
  const [tendered, setTendered] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState<{
    invoiceNo: string;
    channelName: string;
    subtotal: number;
    discountTotal: number;
    grossTotal: number;
    commissionAmount: number;
    fixedFeeAmount: number;
    deliverySubsidy: number;
    netRevenue: number;
    grandTotal: number;
    tenderedAmount: number;
    changeAmount: number;
    items: { name: string; qty: number; unitPrice: number; discountPct: number; total: number }[];
    date: string;
  } | null>(null);

  const activeChannelCfg = useMemo(
    () => channelSettings.channels.find((c) => c.channelId === channel) ?? channelSettings.channels[0],
    [channelSettings, channel]
  );
  const activeChannelMeta = CHANNEL_META[channel];

  // Fungsi kalkulasi harga produk berdasarkan channel & diskon coret
  const getProductPriceInfo = (p: ProductItem) => {
    const channelPrice = getProductPriceForChannel(p.sellPrice, p.id, channel, channelSettings);
    const strikePrice = channelSettings.strikePromos[p.id];
    const hasPromoStrike = typeof strikePrice === "number" && strikePrice > 0;
    return {
      price: hasPromoStrike ? strikePrice : channelPrice,
      originalPrice: channelPrice,
      hasPromoStrike,
    };
  };

  const getProductPrice = (p: ProductItem) => getProductPriceInfo(p).price;

  // Filter Produk
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCat === "all" || p.categoryId === selectedCat;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, selectedCat, search]);

  // Cart operations
  function addToCart(p: ProductItem) {
    const channelPrice = getProductPrice(p);
    setCart((prev) => {
      const existing = prev.find((it) => it.product.id === p.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === p.id ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [...prev, { product: p, qty: 1, discountPct: 0, customPrice: channelPrice }];
    });
  }

  // Jika channel diganti, sesuaikan harga item di keranjang
  function handleChannelChange(newChannel: ChannelId) {
    setChannel(newChannel);
    setCart((prev) =>
      prev.map((it) => {
        const newPrice = getProductPriceForChannel(it.product.sellPrice, it.product.id, newChannel, channelSettings);
        return { ...it, customPrice: newPrice };
      })
    );
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) => {
      return prev
        .map((it) => {
          if (it.product.id === productId) {
            const nextQty = it.qty + delta;
            return nextQty > 0 ? { ...it, qty: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[];
    });
  }

  function updateItemDiscount(productId: string, discountPct: number) {
    setCart((prev) =>
      prev.map((it) =>
        it.product.id === productId ? { ...it, discountPct: Math.max(0, Math.min(100, discountPct)) } : it
      )
    );
  }

  function updateItemPrice(productId: string, newPrice: number) {
    setCart((prev) =>
      prev.map((it) =>
        it.product.id === productId ? { ...it, customPrice: Math.max(0, newPrice) } : it
      )
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((it) => it.product.id !== productId));
  }

  function resetOrder() {
    setCart([]);
    setTendered(0);
    setExtraDiscountTotal(0);
    setDeliverySubsidy(0);
    setError("");
  }

  // Total Belanja sebelum diskon total
  const rawSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = item.customPrice ?? getProductPrice(item.product);
      const lineRaw = price * item.qty;
      const lineDisc = lineRaw * (item.discountPct / 100);
      return sum + (lineRaw - lineDisc);
    }, 0);
  }, [cart, activeChannelCfg]);

  // Otomatis diskon total belanja jika promo bill aktif
  const autoBillDiscount = useMemo(() => {
    return 0; // Bill promo kini dikelola dari program promo di channel settings
  }, [rawSubtotal]);

  // Grand Total setelah diskon otomatis & diskon manual
  const grandTotal = Math.max(0, rawSubtotal - autoBillDiscount - (Number(extraDiscountTotal) || 0));

  // Hitung estimasi potongan platform & penerimaan bersih untuk channel online
  const activeScheme = useMemo(
    () =>
      channelSettings.schemes.find((s) => s.id === activeChannelCfg?.defaultSchemeId) ??
      channelSettings.schemes[0] ??
      DEFAULT_SCHEMES[0],
    [channelSettings.schemes, activeChannelCfg]
  );

  const posCalcResult = useMemo(() => {
    const calcItems = cart.map((it) => {
      const price = it.customPrice ?? getProductPrice(it.product);
      const lineNet = price * it.qty * (1 - it.discountPct / 100);
      return { productId: it.product.id, qty: it.qty, lineNet };
    });
    return calculateCartNetRevenue(
      calcItems,
      autoBillDiscount + (Number(extraDiscountTotal) || 0),
      Number(deliverySubsidy) || 0,
      activeChannelCfg,
      activeScheme,
      channelSettings
    );
  }, [cart, autoBillDiscount, extraDiscountTotal, deliverySubsidy, activeChannelCfg, activeScheme, channelSettings]);

  const netTotalToReceive = channel !== "offline" ? posCalcResult.netRevenue : grandTotal;

  const totalDiscountAmount = useMemo(() => {
    let itemDiscounts = 0;
    for (const item of cart) {
      const price = item.customPrice ?? getProductPrice(item.product);
      itemDiscounts += price * item.qty * (item.discountPct / 100);
    }
    return itemDiscounts + autoBillDiscount + (Number(extraDiscountTotal) || 0);
  }, [cart, autoBillDiscount, extraDiscountTotal, activeChannelCfg]);

  const change = Math.max(0, (tendered || 0) - grandTotal);

  // Preset Uang Pas & Uang Pecahan Cepat
  const quickCashOptions = useMemo(() => {
    if (grandTotal <= 0) return [];
    const base = [grandTotal];
    const multiples = [10000, 20000, 50000, 100000];
    for (const m of multiples) {
      const ceilVal = Math.ceil(grandTotal / m) * m;
      if (!base.includes(ceilVal)) base.push(ceilVal);
    }
    return base.sort((a, b) => a - b).slice(0, 4);
  }, [grandTotal]);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setError("");
    setLoading(true);

    try {
      const effectivePaymentMethod = channel !== "offline" ? CHANNEL_META[channel].name : paymentMethod;
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashAccountId: selectedCashId || cashAccounts[0]?.id,
          paymentMethod: effectivePaymentMethod,
          tenderedAmount: channel === "offline" && paymentMethod === "Tunai" ? (tendered || netTotalToReceive) : netTotalToReceive,
          channelId: channel,
          channel: CHANNEL_META[channel].name,
          schemeId: activeChannelCfg?.defaultSchemeId,
          extraDiscount: Number(extraDiscountTotal) || 0,
          deliverySubsidy: Number(deliverySubsidy) || 0,
          items: cart.map((it) => ({
            productId: it.product.id,
            qty: it.qty,
            unitPrice: it.customPrice ?? getProductPrice(it.product),
            discountPct: it.discountPct,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal memproses transaksi kasir.");
        setLoading(false);
        return;
      }

      setCheckoutSuccess({
        invoiceNo: data.invoice.invoiceNo,
        channelName: CHANNEL_META[channel].name,
        subtotal: rawSubtotal,
        discountTotal: totalDiscountAmount,
        grossTotal: rawSubtotal,
        commissionAmount: data.invoice.commissionAmount || 0,
        fixedFeeAmount: data.invoice.fixedFeeAmount || 0,
        deliverySubsidy: Number(deliverySubsidy) || 0,
        netRevenue: data.invoice.netRevenue ?? data.invoice.grandTotal,
        grandTotal: data.invoice.grandTotal,
        tenderedAmount: data.invoice.tenderedAmount,
        changeAmount: data.invoice.changeAmount,
        items: cart.map((it) => {
          const price = it.customPrice ?? getProductPrice(it.product);
          const lineNet = price * it.qty * (1 - it.discountPct / 100);
          return {
            name: it.product.name,
            qty: it.qty,
            unitPrice: price,
            discountPct: it.discountPct,
            total: lineNet,
          };
        }),
        date: new Date().toLocaleString("id-ID"),
      });

      resetOrder();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Bar Kasir */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            title="Kembali ke Dashboard KASKU"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 text-lg leading-tight">Kasir POS</h1>
              <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {company.name}
              </span>
            </div>
            <p className="text-xs text-slate-500">Pilih channel pelanggan, diskon, &amp; metode pembayaran</p>
          </div>
        </div>

        {/* Tipe Pelanggan / Channel Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <Users className="w-4 h-4 text-slate-500 ml-2 mr-1 hidden sm:block" />
            <div className="flex gap-1">
              {CHANNEL_IDS.map((cid) => {
                const meta = CHANNEL_META[cid];
                const cfg = channelSettings.channels.find((c) => c.channelId === cid);
                return (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => handleChannelChange(cid)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      channel === cid
                        ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{meta.emoji} {meta.badge}</span>
                    {cfg && cfg.commissionPct > 0 && (
                      <span className="text-[9px] text-rose-600 font-extrabold">-{cfg.commissionPct}%</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <Link
            href="/penjualan"
            className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl transition hidden md:block"
          >
            Riwayat Penjualan
          </Link>
        </div>
      </header>

      {/* Main Content: 2 Kolom (Katalog Menu + Keranjang Kasir) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Kolom Kiri: Katalog Menu / Produk */}
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-4">
          {/* Channel Info Banner jika channel ojol */}
          {activeChannelCfg && (activeChannelCfg.commissionPct > 0 || activeChannelCfg.markupPct > 0) && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-4 py-2.5 rounded-2xl flex items-center justify-between">
              <span className="font-semibold">
                Mode: <strong>{CHANNEL_META[channel].name}</strong>
                {activeChannelCfg.markupPct > 0 && ` · Markup +${activeChannelCfg.markupPct}%`}
                {activeChannelCfg.commissionPct > 0 && ` · Komisi ${activeChannelCfg.commissionPct}%`}
                {activeChannelCfg.fixedFeePerOrder > 0 && ` + Rp ${activeChannelCfg.fixedFeePerOrder.toLocaleString("id-ID")}/order`}
              </span>
              <span className="text-[11px] bg-white px-2 py-0.5 rounded-lg border border-blue-200 font-bold">Aktif</span>
            </div>
          )}

          {/* Search + Category Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari menu makanan / minuman / produk..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCat("all")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedCat === "all"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Semua ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(c.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedCat === c.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Menu Kartu */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const inCart = cart.find((it) => it.product.id === p.id);
              const priceInfo = getProductPriceInfo(p);
              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`bg-white rounded-2xl border p-3.5 shadow-xs flex flex-col justify-between cursor-pointer transition active:scale-[0.98] select-none hover:border-blue-300 relative ${
                    inCart ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"
                  }`}
                >
                  {inCart && (
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                      {inCart.qty}
                    </span>
                  )}
                  {priceInfo.hasPromoStrike && (
                    <span className="absolute top-2 right-2 bg-rose-50 text-rose-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-rose-200">
                      PROMO
                    </span>
                  )}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {p.categoryName}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5 line-clamp-2 leading-tight">
                      {p.name}
                    </h3>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-blue-600 text-sm block">
                        {fmtIDR(priceInfo.price)}
                      </span>
                      {priceInfo.hasPromoStrike ? (
                        <span className="text-[10px] text-slate-400 line-through block">
                          {fmtIDR(priceInfo.originalPrice)}
                        </span>
                      ) : activeChannelCfg.markupPct > 0 ? (
                        <span className="text-[10px] text-slate-400 line-through block">
                          {fmtIDR(p.sellPrice)}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                      aria-label="Tambah"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
                Menu / produk tidak ditemukan.
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Panel Keranjang & Pembayaran Kasir */}
        <div className="w-full lg:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shadow-lg z-10">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-900 text-base">Pesanan ({CHANNEL_META[channel].badge})</h2>
              <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                {cart.reduce((s, it) => s + it.qty, 0)} item
              </span>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={resetOrder}
                className="text-xs text-rose-500 hover:underline font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          {/* List Item Keranjang */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[35vh] lg:max-h-none">
            {cart.map((it) => {
              const currentPrice = it.customPrice ?? getProductPrice(it.product);
              const lineRaw = currentPrice * it.qty;
              const lineNet = lineRaw * (1 - it.discountPct / 100);

              return (
                <div
                  key={it.product.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate">
                        {it.product.name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>{fmtIDR(currentPrice)} / {it.product.unit}</span>
                        {channel !== "offline" && getProductFixedCommission(it.product.id, channel, channelSettings) > 0 && (
                          <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-200">
                            Pot. Tetap {fmtIDR(getProductFixedCommission(it.product.id, channel, channelSettings))}/porsi
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(it.product.id)}
                      className="p-1 text-slate-300 hover:text-rose-500"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Kontrol Qty, Diskon Item (%), dan Total Line */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center border border-slate-200 bg-white rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateQty(it.product.id, -1)}
                        className="p-1.5 text-slate-500 hover:text-slate-800"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs text-slate-800">
                        {it.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(it.product.id, 1)}
                        className="p-1.5 text-slate-500 hover:text-slate-800"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Diskon Item (%) */}
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={it.discountPct || ""}
                          onChange={(e) => updateItemDiscount(it.product.id, Number(e.target.value))}
                          placeholder="0"
                          className="w-14 pl-2 pr-5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-right"
                        />
                        <Percent className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="text-right">
                      {it.discountPct > 0 && (
                        <span className="text-[10px] text-slate-400 line-through block">
                          {fmtIDR(lineRaw)}
                        </span>
                      )}
                      <span className="font-bold text-sm text-slate-900">{fmtIDR(lineNet)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {cart.length === 0 && (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-sm">
                <ShoppingCart className="w-8 h-8 stroke-[1.5] mb-2 text-slate-300" />
                <span>Keranjang masih kosong</span>
                <span className="text-xs text-slate-400">Klik menu di sebelah kiri untuk menambah</span>
              </div>
            )}
          </div>

          {/* Form Pembayaran & Checkout */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3.5">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Metode Pembayaran & Akun Kas (hanya untuk Offline / Dine In) */}
            {channel === "offline" ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Metode Bayar
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="QRIS">QRIS</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Kartu Debit">Kartu Debit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Masuk ke Kas/Bank
                  </label>
                  <select
                    value={selectedCashId}
                    onChange={(e) => setSelectedCashId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl font-medium"
                  >
                    {cashAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-800">
                <span className="font-semibold">
                  {CHANNEL_META[channel].emoji} Pembayaran via {CHANNEL_META[channel].name}
                </span>
                <span className="text-[11px] font-bold">Otomatis</span>
              </div>
            )}

            {/* Diskon Otomatis Total Belanja jika aktif */}
            {autoBillDiscount > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <span className="font-semibold">Promo Min. Belanja</span>
                <span className="font-extrabold">- {fmtIDR(autoBillDiscount)}</span>
              </div>
            )}

            {/* Diskon Tambahan / Voucher Kasir & Diskon Ongkir */}
            {cart.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Potongan / Diskon (Rp)</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={extraDiscountTotal || ""}
                    onChange={(e) => setExtraDiscountTotal(Number(e.target.value))}
                    placeholder="0"
                    className="w-28 px-2 py-1 border border-slate-300 rounded-lg font-bold text-right text-xs"
                  />
                </div>

                {channel !== "offline" && (
                  <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <span>Diskon / Subsidi Ongkir (Rp)</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={deliverySubsidy || ""}
                      onChange={(e) => setDeliverySubsidy(Number(e.target.value))}
                      placeholder="0"
                      className="w-28 px-2 py-1 border border-slate-300 rounded-lg font-bold text-right text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Input Uang Diterima (Hanya Jika Offline & Tunai) */}
            {channel === "offline" && paymentMethod === "Tunai" && cart.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Uang Diterima
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {quickCashOptions.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTendered(amt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                        tendered === amt
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {amt === grandTotal ? "Uang Pas" : fmtIDR(amt)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={tendered || ""}
                  onChange={(e) => setTendered(Number(e.target.value))}
                  placeholder={`Min. ${grandTotal}`}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-right"
                />
              </div>
            )}

            {/* Total Ringkasan */}
            <div className="space-y-1 pt-2 border-t border-slate-200">
              {totalDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-xs font-semibold text-rose-600">
                  <span>Total Potongan</span>
                  <span>- {fmtIDR(totalDiscountAmount)}</span>
                </div>
              )}
              {channel !== "offline" && cart.length > 0 && (posCalcResult.commissionAmount > 0 || posCalcResult.fixedFee > 0 || posCalcResult.deliverySubsidy > 0) && (
                <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1 my-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Harga Jual ({CHANNEL_META[channel].badge})</span>
                    <span className="font-semibold">{fmtIDR(grandTotal)}</span>
                  </div>
                  {posCalcResult.commissionAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>
                        {posCalcResult.specialCommissionAmount > 0 && posCalcResult.pctCommissionAmount > 0
                          ? `Komisi (${activeChannelCfg.commissionPct}%) + Pot. Khusus`
                          : posCalcResult.specialCommissionAmount > 0
                            ? "Potongan Khusus Produk"
                            : `Komisi Aplikasi (${activeChannelCfg.commissionPct}%)`}
                      </span>
                      <span className="font-semibold">- {fmtIDR(posCalcResult.commissionAmount)}</span>
                    </div>
                  )}
                  {posCalcResult.fixedFee > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Biaya Tetap Platform</span>
                      <span className="font-semibold">- {fmtIDR(posCalcResult.fixedFee)}</span>
                    </div>
                  )}
                  {posCalcResult.deliverySubsidy > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Diskon / Subsidi Ongkir</span>
                      <span className="font-semibold">- {fmtIDR(posCalcResult.deliverySubsidy)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                <span>{channel !== "offline" ? "Penerimaan Bersih (Net)" : "Total Tagihan"}</span>
                <span className="text-xl text-blue-600 font-extrabold">{fmtIDR(netTotalToReceive)}</span>
              </div>
              {channel === "offline" && paymentMethod === "Tunai" && tendered > netTotalToReceive && (
                <div className="flex justify-between items-center text-xs font-semibold text-emerald-600">
                  <span>Kembalian</span>
                  <span>{fmtIDR(Math.max(0, (tendered || 0) - netTotalToReceive))}</span>
                </div>
              )}
            </div>

            {/* Tombol Selesaikan Transaksi */}
            <button
              type="button"
              disabled={loading || cart.length === 0 || (channel === "offline" && paymentMethod === "Tunai" && tendered > 0 && tendered < netTotalToReceive)}
              onClick={handleCheckout}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Memproses..." : `Simpan Transaksi (${fmtIDR(netTotalToReceive)})`}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Sukses & Cetak Struk */}
      {checkoutSuccess && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Transaksi Berhasil!</h3>
              <p className="text-xs text-slate-500 font-mono">{checkoutSuccess.invoiceNo}</p>
            </div>

            {/* Tampilan Struk Kasir */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-300 text-xs space-y-2 font-mono">
              <div className="text-center pb-2 border-b border-slate-200">
                <div className="font-bold text-sm">{company.name}</div>
                <div>{company.address || "Jl. Raya No. 1"}</div>
                <div className="mt-1 text-[11px] text-blue-600 font-bold uppercase tracking-wider">
                  [{checkoutSuccess.channelName}]
                </div>
                <div className="text-[10px] text-slate-400">{checkoutSuccess.date}</div>
              </div>

              <div className="divide-y divide-slate-100 py-1">
                {checkoutSuccess.items.map((it, idx) => (
                  <div key={idx} className="py-1">
                    <div className="flex justify-between">
                      <span>{it.name}</span>
                      <span>{fmtIDR(it.total)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {it.qty} x {fmtIDR(it.unitPrice)}
                      {it.discountPct > 0 ? ` (Disc ${it.discountPct}%)` : ""}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1">
                {checkoutSuccess.discountTotal > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Diskon</span>
                    <span>- {fmtIDR(checkoutSuccess.discountTotal)}</span>
                  </div>
                )}
                {checkoutSuccess.commissionAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Komisi Platform</span>
                    <span>- {fmtIDR(checkoutSuccess.commissionAmount)}</span>
                  </div>
                )}
                {checkoutSuccess.fixedFeeAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Biaya Tetap</span>
                    <span>- {fmtIDR(checkoutSuccess.fixedFeeAmount)}</span>
                  </div>
                )}
                {checkoutSuccess.deliverySubsidy > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Subsidi Ongkir</span>
                    <span>- {fmtIDR(checkoutSuccess.deliverySubsidy)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm">
                  <span>{checkoutSuccess.commissionAmount > 0 || checkoutSuccess.fixedFeeAmount > 0 ? "Penerimaan Bersih" : "Total"}</span>
                  <span>{fmtIDR(checkoutSuccess.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Bayar</span>
                  <span>{fmtIDR(checkoutSuccess.tenderedAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Kembalian</span>
                  <span>{fmtIDR(checkoutSuccess.changeAmount)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50"
              >
                <Printer className="w-4 h-4" />
                Cetak Struk
              </button>
              <button
                type="button"
                onClick={() => setCheckoutSuccess(null)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
