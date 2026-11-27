"use client";

import { useState } from "react";
import { ArrowRightLeft, ClipboardCheck, Search, Warehouse as WarehouseIcon } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isDefault: boolean;
}

interface ProductOpt {
  id: string;
  sku: string;
  name: string;
  unit: string;
  buyPrice: number;
}

interface StockRow {
  id: string;
  warehouseId: string;
  productId: string;
  qtyOnHand: number;
  avgCost: number;
  warehouse: { id: string; code: string; name: string };
  product: { id: string; sku: string; name: string; unit: string; buyPrice: number; sellPrice: number };
}

interface MovementRow {
  id: string;
  sourceType: string;
  qtyIn: number;
  qtyOut: number;
  unitCost: number;
  movementDate: string;
  warehouse: { id: string; name: string };
  product: { id: string; sku: string; name: string; unit: string };
}

const money = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);

const SOURCE_LABELS: Record<string, string> = {
  PURCHASE: "Pembelian",
  SALE: "Penjualan",
  ADJUSTMENT: "Penyesuaian Stok",
  TRANSFER: "Transfer Gudang",
};

export function InventoryClient({
  initialStocks,
  initialMovements,
  initialWarehouses,
  products,
  initialDate,
}: {
  initialStocks: StockRow[];
  initialMovements: MovementRow[];
  initialWarehouses: WarehouseItem[];
  products: ProductOpt[];
  initialDate: string;
}) {
  const [tab, setTab] = useState<"stocks" | "movements" | "warehouses">("stocks");
  const [stocks, setStocks] = useState(initialStocks);
  const [movements, setMovements] = useState(initialMovements);
  const [warehouses, setWarehouses] = useState(initialWarehouses);
  const [search, setSearch] = useState("");
  const [filterWh, setFilterWh] = useState("all");
  const [error, setError] = useState("");

  // Modals
  const [showAdjust, setShowAdjust] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showWarehouse, setShowWarehouse] = useState(false);

  // Adjust form
  const [adjWarehouseId, setAdjWarehouseId] = useState(initialWarehouses[0]?.id || "");
  const [adjProductId, setAdjProductId] = useState(products[0]?.id || "");
  const [adjNewQty, setAdjNewQty] = useState("0");
  const [adjCost, setAdjCost] = useState(String(products[0]?.buyPrice || 0));
  const [adjDate, setAdjDate] = useState(initialDate);
  const [adjMemo, setAdjMemo] = useState("");

  // Transfer form
  const [trfFromId, setTrfFromId] = useState(initialWarehouses[0]?.id || "");
  const [trfToId, setTrfToId] = useState(initialWarehouses[1]?.id || initialWarehouses[0]?.id || "");
  const [trfProductId, setTrfProductId] = useState(products[0]?.id || "");
  const [trfQty, setTrfQty] = useState("1");

  // Warehouse form
  const [whCode, setWhCode] = useState("");
  const [whName, setWhName] = useState("");
  const [whAddress, setWhAddress] = useState("");

  async function refresh() {
    const [invRes, whRes] = await Promise.all([fetch("/api/inventory"), fetch("/api/warehouses")]);
    if (invRes.ok) {
      const d = await invRes.json();
      setStocks(d.stocks);
      setMovements(d.movements);
    }
    if (whRes.ok) {
      const d = await whRes.json();
      setWarehouses(d.warehouses);
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adjust",
        warehouseId: adjWarehouseId,
        productId: adjProductId,
        newQty: Number(adjNewQty),
        unitCost: Number(adjCost) || 0,
        transDate: adjDate,
        memo: adjMemo,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setShowAdjust(false);
    setAdjMemo("");
    await refresh();
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "transfer",
        fromWarehouseId: trfFromId,
        toWarehouseId: trfToId,
        productId: trfProductId,
        qty: Number(trfQty),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setShowTransfer(false);
    await refresh();
  }

  async function handleCreateWarehouse(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: whCode, name: whName, address: whAddress }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setWhCode("");
    setWhName("");
    setWhAddress("");
    setShowWarehouse(false);
    await refresh();
  }

  const totalQty = stocks.reduce((s, r) => s + r.qtyOnHand, 0);
  const totalValue = stocks.reduce((s, r) => s + r.qtyOnHand * r.avgCost, 0);

  const filteredStocks = stocks.filter((s) => {
    const matchWh = filterWh === "all" || s.warehouseId === filterWh;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      s.product.name.toLowerCase().includes(q) ||
      s.product.sku.toLowerCase().includes(q) ||
      s.warehouse.name.toLowerCase().includes(q);
    return matchWh && matchSearch;
  });

  const filteredMovements = movements.filter((m) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      m.product.name.toLowerCase().includes(q) ||
      m.product.sku.toLowerCase().includes(q) ||
      m.warehouse.name.toLowerCase().includes(q) ||
      (SOURCE_LABELS[m.sourceType] || m.sourceType).toLowerCase().includes(q)
    );
  });

  const filteredWarehouses = warehouses.filter((w) => {
    const q = search.trim().toLowerCase();
    return !q || w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Mobile View */}
      <div className="block lg:hidden space-y-4 pb-24">
        {/* Mobile Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Nilai Persediaan
            </span>
            <span className="text-base font-extrabold text-blue-600 mt-0.5 block truncate">
              {money(totalValue)}
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Unit
            </span>
            <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
              {totalQty.toLocaleString("id-ID")}{" "}
              <span className="text-xs font-normal text-slate-400">unit</span>
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setError("");
              setShowTransfer(true);
            }}
            className="py-2.5 px-3 rounded-2xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            <span>Transfer Gudang</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setShowAdjust(true);
            }}
            className="py-2.5 px-3 rounded-2xl bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Penyesuaian Stok</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari barang, SKU, atau gudang..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex gap-2 border-b border-slate-200/80 pb-1 overflow-x-auto no-scrollbar">
          {[
            { key: "stocks", label: `Stok (${filteredStocks.length})` },
            { key: "movements", label: `Pergerakan (${filteredMovements.length})` },
            { key: "warehouses", label: `Gudang (${filteredWarehouses.length})` },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as typeof tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                tab === t.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content: Stocks */}
        {tab === "stocks" && (
          <div className="space-y-2.5">
            {/* Warehouse Filter Chips */}
            {warehouses.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  type="button"
                  onClick={() => setFilterWh("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                    filterWh === "all"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-slate-100 text-slate-600 border border-transparent"
                  }`}
                >
                  Semua Gudang
                </button>
                {warehouses.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setFilterWh(w.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                      filterWh === w.id
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "bg-slate-100 text-slate-600 border border-transparent"
                    }`}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            )}

            {filteredStocks.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {s.product.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {s.product.sku} ·{" "}
                      <span className="text-slate-600 font-sans">{s.warehouse.name}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-extrabold text-blue-600">
                      {s.qtyOnHand.toLocaleString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{s.product.unit}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">HPP Rata-rata</span>
                    <span className="font-semibold text-slate-700">{money(s.avgCost)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Total Nilai Stok</span>
                    <span className="font-bold text-slate-900">
                      {money(s.qtyOnHand * s.avgCost)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filteredStocks.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
                Stok tidak ditemukan.
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Movements */}
        {tab === "movements" && (
          <div className="space-y-2.5">
            {filteredMovements.map((m) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-100 p-3.5 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.qtyIn > 0
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {SOURCE_LABELS[m.sourceType] || m.sourceType}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(m.movementDate).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0 font-extrabold text-sm">
                    {m.qtyIn > 0 ? (
                      <span className="text-emerald-600">+{m.qtyIn}</span>
                    ) : (
                      <span className="text-rose-600">-{m.qtyOut}</span>
                    )}{" "}
                    <span className="text-[11px] font-normal text-slate-500">{m.product.unit}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{m.product.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {m.product.sku} · {m.warehouse.name}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] text-slate-400 block">HPP</span>
                    <span className="font-semibold text-slate-700">{money(m.unitCost)}</span>
                  </div>
                </div>
              </div>
            ))}

            {filteredMovements.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
                Belum ada pergerakan stok.
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Warehouses */}
        {tab === "warehouses" && (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setError("");
                setShowWarehouse(true);
              }}
              className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-blue-300 text-blue-600 bg-blue-50/50 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.99] transition"
            >
              <WarehouseIcon className="w-4 h-4" />
              <span>+ Tambah Gudang Baru</span>
            </button>

            {filteredWarehouses.map((w) => (
              <div
                key={w.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600">{w.code}</span>
                  {w.isDefault && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      Gudang Utama
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-900 text-sm">{w.name}</div>
                <div className="text-xs text-slate-500">{w.address || "Tidak ada alamat tercatat"}</div>
              </div>
            ))}

            {filteredWarehouses.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
                Gudang tidak ditemukan.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventori / Persediaan</h1>
          <p className="text-sm text-slate-500">
            Pantau stok per gudang, penyesuaian stok opname, transfer gudang, dan kartu stok.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setError("");
              setShowWarehouse(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            <WarehouseIcon className="w-4 h-4" />
            + Gudang
          </button>
          <button
            onClick={() => {
              setError("");
              setShowTransfer(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transfer Gudang
          </button>
          <button
            onClick={() => {
              setError("");
              setShowAdjust(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <ClipboardCheck className="w-4 h-4" />
            Penyesuaian Stok
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Nilai Persediaan</div>
          <div className="mt-1 text-xl font-bold text-blue-600">{money(totalValue)}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Total Unit Tersedia</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{totalQty.toLocaleString("id-ID")}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500 uppercase">Jumlah Gudang</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{warehouses.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: "stocks", label: "Stok Gudang" },
          { key: "movements", label: "Pergerakan Stok" },
          { key: "warehouses", label: "Daftar Gudang" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stocks" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3 text-right">Qty Tersedia</th>
                <th className="px-4 py-3 text-right">HPP Rata-rata</th>
                <th className="px-4 py-3 text-right">Nilai Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stocks.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.product.sku}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{s.product.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.warehouse.name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {s.qtyOnHand.toLocaleString("id-ID")} {s.product.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{money(s.avgCost)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">
                    {money(s.qtyOnHand * s.avgCost)}
                  </td>
                </tr>
              ))}
              {stocks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Belum ada data stok. Tambahkan produk bertipe Barang atau lakukan Penyesuaian Stok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "movements" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Sumber</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3 text-right">Masuk</th>
                <th className="px-4 py-3 text-right">Keluar</th>
                <th className="px-4 py-3 text-right">HPP / Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(m.movementDate).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {SOURCE_LABELS[m.sourceType] || m.sourceType}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{m.product.name}</td>
                  <td className="px-4 py-3 text-slate-600">{m.warehouse.name}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                    {m.qtyIn > 0 ? `+${m.qtyIn}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                    {m.qtyOut > 0 ? `-${m.qtyOut}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{money(m.unitCost)}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Belum ada pergerakan stok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "warehouses" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div key={w.id} className="bg-white p-5 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500">{w.code}</span>
                {w.isDefault && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                    Utama
                  </span>
                )}
              </div>
              <div className="font-semibold text-slate-900">{w.name}</div>
              <div className="text-xs text-slate-500">{w.address || "Tidak ada alamat"}</div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Modal Penyesuaian Stok */}
      {showAdjust && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Penyesuaian Stok (Opname)</h2>
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>}
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Gudang</label>
                <select
                  value={adjWarehouseId}
                  onChange={(e) => setAdjWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Produk</label>
                <select
                  value={adjProductId}
                  onChange={(e) => {
                    setAdjProductId(e.target.value);
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) setAdjCost(String(p.buyPrice));
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Stok Fisik Baru</label>
                  <input
                    type="number"
                    required
                    value={adjNewQty}
                    onChange={(e) => setAdjNewQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">HPP / Unit</label>
                  <CurrencyInput
                    value={adjCost}
                    onValueChange={setAdjCost}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal & Catatan</label>
                <input
                  type="date"
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2"
                />
                <input
                  value={adjMemo}
                  onChange={(e) => setAdjMemo(e.target.value)}
                  placeholder="Alasan penyesuaian (mis. Stok Opname)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjust(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Simpan Penyesuaian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Transfer Gudang */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Transfer Antar Gudang</h2>
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>}
            <form onSubmit={handleTransfer} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dari Gudang</label>
                <select
                  value={trfFromId}
                  onChange={(e) => setTrfFromId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ke Gudang</label>
                <select
                  value={trfToId}
                  onChange={(e) => setTrfToId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Produk</label>
                  <select
                    value={trfProductId}
                    onChange={(e) => setTrfProductId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={trfQty}
                    onChange={(e) => setTrfQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransfer(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Transfer Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Gudang */}
      {showWarehouse && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Tambah Gudang Baru</h2>
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>}
            <form onSubmit={handleCreateWarehouse} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kode Gudang</label>
                <input
                  required
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value)}
                  placeholder="GUD-02"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Gudang</label>
                <input
                  required
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  placeholder="Gudang Cabang Bandung"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Alamat</label>
                <input
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWarehouse(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Simpan Gudang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
