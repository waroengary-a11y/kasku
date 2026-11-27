"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Filter,
  MoreVertical,
  Printer,
  Search,
  ShoppingBag,
  ShoppingCart,
  Wallet,
  Package,
  BarChart3,
  CreditCard,
  Users,
  Store,
} from "lucide-react";
import {
  AgingBarChartSVG,
  AreaChartSVG,
  DonutChartSVG,
  GroupedBarChartSVG,
  LineChartSVG,
} from "@/components/DashboardCharts";

export interface DashboardPayload {
  cashWidgets: Array<{
    id: string;
    code: string;
    name: string;
    balance: number;
    series: Array<{ label: string; value: number }>;
  }>;
  apAging: {
    openCount: number;
    openTotal: number;
    overdueCount: number;
    overdueTotal: number;
    buckets: Array<{ label: string; value: number }>;
  };
  arAging: {
    openCount: number;
    openTotal: number;
    overdueCount: number;
    overdueTotal: number;
    buckets: Array<{ label: string; value: number }>;
  };
  expenseBreakdown: {
    slices: Array<{ name: string; value: number }>;
    total: number;
  };
  cashFlowMonthly: Array<{ label: string; inVal: number; outVal: number; net: number }>;
  profitLossMonthly: {
    netProfitYear: number;
    series: Array<{ label: string; gross: number; net: number }>;
  };
  netAccountMovements: Array<{
    id: string;
    code: string;
    name: string;
    thisMonth: number;
    thisYear: number;
    lastMonth: number;
  }>;
  salesMonthly: {
    thisMonthCount: number;
    thisMonthTotal: number;
    series: Array<{ label: string; value: number }>;
  };
  arApMonthly: {
    apCount: number;
    apTotal: number;
    arCount: number;
    arTotal: number;
    series: Array<{ label: string; ar: number; ap: number; net: number }>;
  };
}

function fmt(n: number) {
  return Math.round(n || 0).toLocaleString("id-ID");
}

const PERIOD_OPTIONS = [
  { key: "this_month", label: "Bulan Ini" },
  { key: "last_month", label: "Bulan Lalu" },
  { key: "this_year", label: "Tahun Ini" },
  { key: "last_year", label: "Tahun Lalu" },
  { key: "custom", label: "Custom" },
] as const;

function FilterMenu({
  widget,
  period,
  onSelect,
}: {
  widget: string;
  period: string;
  onSelect: (widget: string, period: string, start?: string, end?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600"
        title="Filter periode"
      >
        <Filter className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-30 text-xs">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                if (opt.key !== "custom") {
                  onSelect(widget, opt.key);
                  setOpen(false);
                } else {
                  onSelect(widget, "custom", customStart, customEnd);
                }
              }}
              className={`w-full text-left px-3.5 py-2 transition ${
                period === opt.key
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
          {period === "custom" && (
            <div className="px-3 py-2 border-t border-slate-100 space-y-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
              />
              <button
                type="button"
                onClick={() => {
                  onSelect(widget, "custom", customStart, customEnd);
                  setOpen(false);
                }}
                className="w-full py-1 rounded bg-blue-600 text-white text-[11px] font-medium"
              >
                Terapkan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DashboardClient({
  data,
  companyName,
  userName = "RENDY",
}: {
  data: DashboardPayload;
  companyName?: string;
  userName?: string;
}) {
  const [search, setSearch] = useState("");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);

  // Interactive widget states
  const [expensePeriod, setExpensePeriod] = useState("this_month");
  const [expenseData, setExpenseData] = useState(data.expenseBreakdown);

  const [cashflowPeriod, setCashflowPeriod] = useState("this_year");
  const [cashflowData, setCashflowData] = useState(data.cashFlowMonthly);

  const [plPeriod, setPlPeriod] = useState("this_year");
  const [plData, setPlData] = useState(data.profitLossMonthly);

  const [salesPeriod, setSalesPeriod] = useState("this_year");
  const [salesData, setSalesData] = useState(data.salesMonthly);

  async function handleFilter(widget: string, period: string, start?: string, end?: string) {
    if (widget === "expense") setExpensePeriod(period);
    if (widget === "cashflow") setCashflowPeriod(period);
    if (widget === "pl") setPlPeriod(period);
    if (widget === "sales") setSalesPeriod(period);

    if (period === "custom" && (!start || !end)) return;

    const qs = new URLSearchParams({ widget, period });
    if (start) qs.set("start", start);
    if (end) qs.set("end", end);
    const res = await fetch(`/api/dashboard/widget?${qs.toString()}`);
    if (!res.ok) return;
    const d = await res.json();
    if (widget === "expense") setExpenseData(d);
    if (widget === "cashflow") setCashflowData(d.series || []);
    if (widget === "pl") setPlData({ netProfitYear: d.netProfitYear ?? 0, series: d.series || [] });
    if (widget === "sales")
      setSalesData({ thisMonthCount: d.count ?? 0, thisMonthTotal: d.total ?? 0, series: d.series || [] });
  }

  const expenseTitle =
    expensePeriod === "last_month"
      ? "BIAYA BULAN LALU"
      : expensePeriod === "this_year"
      ? "BIAYA TAHUN INI"
      : expensePeriod === "last_year"
      ? "BIAYA TAHUN LALU"
      : expensePeriod === "custom"
      ? "BIAYA PERIODE PILIHAN"
      : "BIAYA BULAN INI";

  function toggleCard(key: string) {
    setHiddenCards((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const q = search.trim().toLowerCase();
  const isVisible = (key: string, title: string) =>
    !hiddenCards.includes(key) && (!q || title.toLowerCase().includes(q));

  const areaColors = ["#ff5a79", "#f7c348", "#42bfb9", "#2f80ed"];

  const widgetOptions = [
    ...data.cashWidgets.map((c) => ({ key: `cash-${c.id}`, title: c.name })),
    { key: "ap-aging", title: "TAGIHAN YANG PERLU KAMU BAYAR" },
    { key: "expense-donut", title: "BIAYA BULAN BERJALAN" },
    { key: "cashflow", title: "TOTAL KELUAR MASUK KAS" },
    { key: "profit-loss", title: "LABA RUGI" },
    { key: "net-movement", title: "NET PERGERAKAN AKUN" },
    { key: "sales-line", title: "PENJUALAN" },
    { key: "ar-aging", title: "TAGIHAN PELANGGAN TERHUTANG" },
    { key: "ar-ap", title: "HUTANG & PIUTANG" },
  ];

  return (
    <div>
      {/* ==================================================== */}
      {/* MOBILE DASHBOARD VIEW (Matches Screenshot 1 EXACTLY) */}
      {/* ==================================================== */}
      <div className="block lg:hidden bg-slate-50 min-h-screen pb-14">
        {/* Curved Blue Hero Greeting */}
        <div className="bg-gradient-to-b from-blue-700 via-blue-700 to-blue-800 text-white px-5 pt-3 pb-16 rounded-b-[36px] relative overflow-hidden">
          {/* Decorative 8-dot grid on top right */}
          <div className="absolute right-6 top-3 grid grid-cols-4 gap-2 opacity-30 pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" />
            ))}
          </div>

          <div className="relative z-10 space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Hi {userName}!
            </h1>
            <p className="text-xs text-blue-100 font-medium">
              Yuk mudahkan keuangan bisnis dengan Kasku
            </p>
          </div>
        </div>

        {/* Floating Quick Menu Card (8 Items) */}
        <div className="-mt-10 mx-4 bg-white rounded-3xl p-5 shadow-xl shadow-blue-950/10 border border-slate-100/90 relative z-20">
          <div className="grid grid-cols-4 gap-y-4 gap-x-2 text-center">
            {/* Penjualan */}
            <Link href="/penjualan" className="flex flex-col items-center group">
              <div className="w-13 h-13 rounded-2xl bg-[#e6f9f0] flex items-center justify-center shadow-xs active:scale-95 transition group-hover:scale-105">
                <ShoppingBag className="w-6 h-6 text-[#10b981]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 mt-1.5">Penjualan</span>
            </Link>

            {/* Pembelian */}
            <Link href="/pembelian" className="flex flex-col items-center group">
              <div className="w-13 h-13 rounded-2xl bg-[#e0f2fe] flex items-center justify-center shadow-xs active:scale-95 transition group-hover:scale-105">
                <ShoppingCart className="w-6 h-6 text-[#0284c7]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 mt-1.5">Pembelian</span>
            </Link>

            {/* Biaya */}
            <Link href="/biaya" className="flex flex-col items-center group">
              <div className="w-13 h-13 rounded-2xl bg-[#ffedd5] flex items-center justify-center shadow-xs active:scale-95 transition group-hover:scale-105">
                <Wallet className="w-6 h-6 text-[#ea580c]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 mt-1.5">Biaya</span>
            </Link>

            {/* Produk */}
            <Link href="/produk" className="flex flex-col items-center group">
              <div className="w-13 h-13 rounded-2xl bg-[#fef3c7] flex items-center justify-center shadow-xs active:scale-95 transition group-hover:scale-105">
                <Package className="w-6 h-6 text-[#d97706]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 mt-1.5">Produk</span>
            </Link>

            {/* Laporan */}
            <Link href="/laporan" className="flex flex-col items-center group">
              <div className="w-13 h-13 rounded-2xl bg-[#f3e8ff] flex items-center justify-center shadow-xs active:scale-95 transition group-hover:scale-105">
                <BarChart3 className="w-6 h-6 text-[#9333ea]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 mt-1.5">Laporan</span>
            </Link>

            {/* Kas & Bank */}
            <Link href="/kas-bank" className="flex flex-col items-center group">
              <div className="w-13 h-13 rounded-2xl bg-[#ccfbf1] flex items-center justify-center shadow-xs active:scale-95 transition group-hover:scale-105">
                <CreditCard className="w-6 h-6 text-[#0d9488]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 mt-1.5">Kas &amp; Bank</span>
            </Link>

            {/* Kasir POS */}
            <Link href="/kasir" className="flex flex-col items-center group">
              <div className="w-13 h-13 rounded-2xl bg-[#e0e7ff] flex items-center justify-center shadow-xs active:scale-95 transition group-hover:scale-105">
                <Store className="w-6 h-6 text-[#4f46e5]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 mt-1.5">Kasir POS</span>
            </Link>

            {/* Kontak */}
            <Link href="/kontak" className="flex flex-col items-center group">
              <div className="w-13 h-13 rounded-2xl bg-[#ffe4e6] flex items-center justify-center shadow-xs active:scale-95 transition group-hover:scale-105">
                <Users className="w-6 h-6 text-[#e11d48]" />
              </div>
              <span className="text-[11px] font-semibold text-slate-800 mt-1.5">Kontak</span>
            </Link>
          </div>
        </div>

        {/* Section: Kas & Bank */}
        <div className="px-4 mt-7">
          <h2 className="text-base font-bold text-slate-900 mb-3">Kas &amp; Bank</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 no-scrollbar">
            {data.cashWidgets.map((cw) => {
              const initial = (cw.name || "K").trim().slice(0, 1).toUpperCase();
              return (
                <Link
                  key={cw.id}
                  href={`/kas-bank/${cw.id}`}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3 min-w-[170px] flex-shrink-0 active:scale-98 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">
                      {cw.name}
                    </div>
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {fmt(cw.balance)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Section: Performa Bisnis */}
        <div className="px-4 mt-6">
          <h2 className="text-base font-bold text-slate-900 mb-3">Performa Bisnis</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 pt-0.5 no-scrollbar">
            {data.cashWidgets.map((cw) => (
              <div
                key={cw.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 min-w-[285px] max-w-[320px] flex-shrink-0 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/kas-bank/${cw.id}`}
                    className="text-sm font-bold text-slate-800 hover:text-blue-600 uppercase tracking-wide"
                  >
                    {cw.name}
                  </Link>
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-right text-xs space-y-0.5">
                  <div className="text-slate-600">
                    Saldo di kasku <strong className="text-slate-900 font-bold">{fmt(cw.balance)}</strong>
                  </div>
                  <div className="text-slate-400">
                    Saldo Statement <strong className="text-slate-700">0</strong>
                  </div>
                </div>
                <div className="h-32 pt-1">
                  <AreaChartSVG data={cw.series} color="#ff5a79" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Mobile Widgets */}
        <div className="px-4 mt-4 space-y-4">
          {/* AP Aging */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              TAGIHAN YANG PERLU KAMU BAYAR
            </h3>
            <div className="text-right text-xs space-y-0.5">
              <div className="text-slate-700">
                {data.apAging.openCount} Menunggu pembayaran{" "}
                <strong className="text-slate-900">{fmt(data.apAging.openTotal)}</strong>
              </div>
              <div className="text-slate-700">
                {data.apAging.overdueCount} Jatuh tempo{" "}
                <strong className="text-red-600">{fmt(data.apAging.overdueTotal)}</strong>
              </div>
            </div>
            <AgingBarChartSVG buckets={data.apAging.buckets} color="#ff5a79" />
          </div>

          {/* Biaya Donut */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {expenseTitle}
            </h3>
            <DonutChartSVG slices={expenseData.slices} />
            <div className="border-t border-slate-100 pt-2 text-xs">
              <div className="flex justify-between font-semibold py-1">
                <span>Total Biaya</span>
                <span>{fmt(expenseData.total)}</span>
              </div>
            </div>
          </div>

          {/* Laba Rugi */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              LABA RUGI
            </h3>
            <div className="text-right text-xs text-slate-600">
              Laba bersih tahun ini{" "}
              <strong className="text-slate-900">{fmt(plData.netProfitYear)}</strong>
            </div>
            <GroupedBarChartSVG
              data={plData.series}
              bars={[
                { key: "gross", label: "Laba kotor", color: "#42bfb9" },
                { key: "net", label: "Laba bersih", color: "#f7c348" },
              ]}
            />
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* DESKTOP DASHBOARD VIEW (Unchanged Desktop Experience) */}
      {/* ==================================================== */}
      <div className="hidden lg:block space-y-5">
        {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Beranda</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari widget..."
              className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* 2-Column Kledo Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Per-Account Kas & Bank Area Charts */}
        {data.cashWidgets.map((cw, idx) => {
          const key = `cash-${cw.id}`;
          if (!isVisible(key, cw.name)) return null;
          return (
            <div key={cw.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <Link
                  href={`/kas-bank/${cw.id}`}
                  className="text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-blue-600 hover:underline"
                >
                  {cw.name}
                </Link>
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-right text-xs space-y-0.5">
                <div className="text-slate-700">
                  Saldo di KASKU <strong className="text-slate-900">{fmt(cw.balance)}</strong>
                </div>
                <div className="text-slate-500">
                  Saldo di bank <strong className="text-slate-700">0</strong>
                </div>
              </div>
              <AreaChartSVG data={cw.series} color={areaColors[idx % areaColors.length]} />
            </div>
          );
        })}

        {/* Tagihan yang Perlu Kamu Bayar (AP Aging) */}
        {isVisible("ap-aging", "TAGIHAN YANG PERLU KAMU BAYAR") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                TAGIHAN YANG PERLU KAMU BAYAR
              </h2>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div className="text-slate-700">
                {data.apAging.openCount} Menunggu pembayaran{" "}
                <strong className="text-slate-900">{fmt(data.apAging.openTotal)}</strong>
              </div>
              <div className="text-slate-700">
                {data.apAging.overdueCount} Jatuh tempo{" "}
                <strong className="text-red-600">{fmt(data.apAging.overdueTotal)}</strong>
              </div>
            </div>
            <AgingBarChartSVG buckets={data.apAging.buckets} color="#ff5a79" />
          </div>
        )}

        {/* Biaya Bulan Berjalan (Donut + Breakdown Table) */}
        {isVisible("expense-donut", expenseTitle) && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {expenseTitle}
              </h2>
              <div className="flex items-center gap-1 text-slate-400">
                <FilterMenu widget="expense" period={expensePeriod} onSelect={handleFilter} />
                <MoreVertical className="w-4 h-4" />
              </div>
            </div>
            <DonutChartSVG slices={expenseData.slices} />
            <div className="border-t border-slate-100 pt-2 text-xs">
              {expenseData.slices.map((s) => (
                <div key={s.name} className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-700">{s.name}</span>
                  <span className="font-medium text-slate-900">{fmt(s.value)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2.5 px-2 bg-slate-100 rounded-md font-bold text-slate-900 mt-1">
                <span>Total</span>
                <span>{fmt(expenseData.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Total Keluar Masuk Kas */}
        {isVisible("cashflow", "TOTAL KELUAR MASUK KAS") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                TOTAL KELUAR MASUK KAS
              </h2>
              <div className="flex items-center gap-1 text-slate-400">
                <FilterMenu widget="cashflow" period={cashflowPeriod} onSelect={handleFilter} />
                <MoreVertical className="w-4 h-4" />
              </div>
            </div>
            <GroupedBarChartSVG
              data={cashflowData}
              bars={[
                { key: "inVal", label: "In", color: "#42bfb9" },
                { key: "outVal", label: "Out", color: "#ff2a68" },
              ]}
              lineKey="net"
            />
          </div>
        )}

        {/* Laba Rugi */}
        {isVisible("profit-loss", "LABA RUGI") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                LABA RUGI
              </h2>
              <div className="flex items-center gap-1 text-slate-400">
                <FilterMenu widget="pl" period={plPeriod} onSelect={handleFilter} />
                <MoreVertical className="w-4 h-4" />
              </div>
            </div>
            <div className="text-right text-xs text-slate-700">
              Laba bersih periode terpilih{" "}
              <strong className="text-slate-900">{fmt(plData.netProfitYear)}</strong>
            </div>
            <GroupedBarChartSVG
              data={plData.series}
              bars={[
                { key: "gross", label: "Laba kotor", color: "#42bfb9" },
                { key: "net", label: "Laba bersih", color: "#f7c348" },
              ]}
            />
          </div>
        )}

        {/* Net Pergerakan Akun */}
        {isVisible("net-movement", "NET PERGERAKAN AKUN") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                NET PERGERAKAN AKUN
              </h2>
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="py-2 px-2 text-left"></th>
                  <th className="py-2 px-2 text-right font-semibold">Bulan ini</th>
                  <th className="py-2 px-2 text-right font-semibold">Tahun ini</th>
                  <th className="py-2 px-2 text-right font-semibold">Bulan Lalu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.netAccountMovements.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-2">
                      <div className="font-semibold text-slate-900">{a.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{a.code}</div>
                    </td>
                    <td className={`py-2.5 px-2 text-right font-medium ${a.thisMonth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {fmt(a.thisMonth)}
                    </td>
                    <td className={`py-2.5 px-2 text-right font-medium ${a.thisYear >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {fmt(a.thisYear)}
                    </td>
                    <td className={`py-2.5 px-2 text-right font-medium ${a.lastMonth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {fmt(a.lastMonth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Penjualan Line Chart */}
        {isVisible("sales-line", "PENJUALAN") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                PENJUALAN
              </h2>
              <div className="flex items-center gap-1 text-slate-400">
                <FilterMenu widget="sales" period={salesPeriod} onSelect={handleFilter} />
                <MoreVertical className="w-4 h-4" />
              </div>
            </div>
            <div className="text-right text-xs text-slate-700">
              {salesData.thisMonthCount} Penjualan periode terpilih{" "}
              <strong className="text-slate-900">{fmt(salesData.thisMonthTotal)}</strong>
            </div>
            <LineChartSVG data={salesData.series} color="#2f80ed" />
          </div>
        )}

        {/* Tagihan Pelanggan Terhutang (AR Aging) */}
        {isVisible("ar-aging", "TAGIHAN PELANGGAN TERHUTANG") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                TAGIHAN PELANGGAN TERHUTANG
              </h2>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div className="text-slate-700">
                {data.arAging.openCount} Menunggu pembayaran{" "}
                <strong className="text-slate-900">{fmt(data.arAging.openTotal)}</strong>
              </div>
              <div className="text-slate-700">
                {data.arAging.overdueCount} Jatuh tempo{" "}
                <strong className="text-red-600">{fmt(data.arAging.overdueTotal)}</strong>
              </div>
            </div>
            <AgingBarChartSVG buckets={data.arAging.buckets} color="#ff5a79" />
          </div>
        )}

        {/* Hutang & Piutang */}
        {isVisible("ar-ap", "HUTANG & PIUTANG") && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                HUTANG & PIUTANG
              </h2>
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div className="text-slate-700">
                {data.arApMonthly.apCount} Hutang{" "}
                <strong className="text-slate-900">{fmt(data.arApMonthly.apTotal)}</strong>
              </div>
              <div className="text-slate-700">
                {data.arApMonthly.arCount} Piutang{" "}
                <strong className="text-slate-900">{fmt(data.arApMonthly.arTotal)}</strong>
              </div>
            </div>
            <GroupedBarChartSVG
              data={data.arApMonthly.series}
              bars={[
                { key: "ar", label: "Piutang", color: "#42bfb9" },
                { key: "ap", label: "Hutang", color: "#ff2a68" },
              ]}
              lineKey="net"
            />
          </div>
        )}
      </div>

      {/* Footer Ubah Dashboard */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
        <button
          type="button"
          onClick={() => setCustomizeOpen((v) => !v)}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Ubah Dashboard
        </button>

        {customizeOpen && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap justify-center gap-2">
            {widgetOptions.map((w) => {
              const active = !hiddenCards.includes(w.key);
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => toggleCard(w.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    active
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  {w.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
