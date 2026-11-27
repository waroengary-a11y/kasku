"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  sellPrice: number;
  categoryId: string | null;
  categoryName: string;
}

interface CartItem {
  product: ProductItem;
  qty: number;
}

interface CashAccount {
  id: string;
  name: string;
  balance: number;
}

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
}: {
  company: { name: string; address: string | null; phone: string | null };
  products: ProductItem[];
  categories: { id: string; name: string }[];
  cashAccounts: CashAccount[];
}) {
  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCashId, setSelectedCashId] = useState(cashAccounts[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState("Tunai");
  const [tendered, setTendered] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState<{
    invoiceNo: string;
    grandTotal: number;
    tenderedAmount: number;
    changeAmount: number;
    items: { name: string; qty: number; total: number }[];
    date: string;
  } | null>(null);

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

  // Total Belanja
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.sellPrice * item.qty, 0);
  }, [cart]);

  const change = Math.max(0, (tendered || 0) - totalAmount);

  // Cart operations
  function addToCart(p: ProductItem) {
    setCart((prev) => {
      const existing = prev.find((it) => it.product.id === p.id);
      if (existing) {
        return prev.map((it) =>
          it.product.id === p.id ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [...prev, { product: p, qty: 1 }];
    });
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

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((it) => it.product.id !== productId));
  }

  function resetOrder() {
    setCart([]);
    setTendered(0);
    setError("");
  }

  // Preset Uang Pas & Uang Pecahan Cepat
  const quickCashOptions = useMemo(() => {
    if (totalAmount <= 0) return [];
    const base = [totalAmount];
    const multiples = [10000, 20000, 50000, 100000];
    for (const m of multiples) {
      const ceilVal = Math.ceil(totalAmount / m) * m;
      if (!base.includes(ceilVal)) base.push(ceilVal);
    }
    return base.sort((a, b) => a - b).slice(0, 4);
  }, [totalAmount]);

  async function handleCheckout() {
    if (cart.length === 0) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashAccountId: selectedCashId,
          paymentMethod,
          tenderedAmount: paymentMethod === "Tunai" ? (tendered || totalAmount) : totalAmount,
          items: cart.map((it) => ({
            productId: it.product.id,
            qty: it.qty,
            unitPrice: it.product.sellPrice,
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
        grandTotal: data.invoice.grandTotal,
        tenderedAmount: data.invoice.tenderedAmount,
        changeAmount: data.invoice.changeAmount,
        items: cart.map((it) => ({
          name: it.product.name,
          qty: it.qty,
          total: it.product.sellPrice * it.qty,
        })),
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
            <p className="text-xs text-slate-500">Pilih menu, catat pembayaran &amp; potong stok otomatis</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/penjualan"
            className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition"
          >
            Riwayat Penjualan
          </Link>
        </div>
      </header>

      {/* Main Content: 2 Kolom (Katalog Menu + Keranjang Kasir) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Kolom Kiri: Katalog Menu / Produk */}
        <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-4">
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
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {p.categoryName}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5 line-clamp-2 leading-tight">
                      {p.name}
                    </h3>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-extrabold text-blue-600 text-sm">
                      {fmtIDR(p.sellPrice)}
                    </span>
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
        <div className="w-full lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shadow-lg z-10">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-900 text-base">Pesanan</h2>
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
            {cart.map((it) => (
              <div
                key={it.product.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-sm truncate">
                    {it.product.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {fmtIDR(it.product.sellPrice)} / {it.product.unit}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
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

                  <span className="font-bold text-sm text-slate-900 w-20 text-right">
                    {fmtIDR(it.product.sellPrice * it.qty)}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeItem(it.product.id)}
                    className="p-1 text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

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

            {/* Metode Pembayaran & Akun Kas */}
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

            {/* Input Uang Diterima (Jika Tunai) */}
            {paymentMethod === "Tunai" && cart.length > 0 && (
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
                      {amt === totalAmount ? "Uang Pas" : fmtIDR(amt)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={tendered || ""}
                  onChange={(e) => setTendered(Number(e.target.value))}
                  placeholder={`Min. ${totalAmount}`}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-right"
                />
              </div>
            )}

            {/* Total Ringkasan */}
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Total Tagihan</span>
                <span className="text-xl text-blue-600 font-extrabold">{fmtIDR(totalAmount)}</span>
              </div>
              {paymentMethod === "Tunai" && tendered > totalAmount && (
                <div className="flex justify-between items-center text-xs font-semibold text-emerald-600">
                  <span>Kembalian</span>
                  <span>{fmtIDR(change)}</span>
                </div>
              )}
            </div>

            {/* Tombol Selesaikan Transaksi */}
            <button
              type="button"
              disabled={loading || cart.length === 0 || (paymentMethod === "Tunai" && tendered > 0 && tendered < totalAmount)}
              onClick={handleCheckout}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Memproses..." : `Bayar & Cetak Struk (${fmtIDR(totalAmount)})`}
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
                <div>{checkoutSuccess.date}</div>
              </div>

              <div className="divide-y divide-slate-100 py-1">
                {checkoutSuccess.items.map((it, idx) => (
                  <div key={idx} className="py-1 flex justify-between">
                    <span>
                      {it.name} x{it.qty}
                    </span>
                    <span>{fmtIDR(it.total)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
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
