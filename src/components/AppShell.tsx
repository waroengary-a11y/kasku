"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Menu,
  Search,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Bell,
  LogOut,
  Trash2,
  Sun,
  PanelLeft,
  X,
  SlidersHorizontal,
  Home,
  ShoppingBag,
  ShoppingCart,
  Wallet,
  Package,
  Boxes,
  BarChart3,
  CreditCard,
  BookOpen,
  Building2,
  Users,
  Settings,
  Tag,
} from "lucide-react";
import {
  IconBeranda,
  IconPenjualan,
  IconPembelian,
  IconBiaya,
  IconProduk,
  IconInventori,
  IconLaporan,
  IconKasBank,
  IconAkun,
  IconJurnal,
  IconKontak,
  IconPengaturan,
  IconSubOverview,
  IconSubTagihan,
  IconSubPengiriman,
  IconSubPemesanan,
  IconSubPenawaran,
} from "@/components/KledoIcons";

interface AppShellProps {
  companyName: string;
  userName: string;
  isDemo: boolean;
  children: React.ReactNode;
}

const navItems = [
  { href: "/biaya", label: "Biaya", Icon: IconBiaya },
  { href: "/produk", label: "Produk", Icon: IconProduk },
  { href: "/inventori", label: "Inventori", Icon: IconInventori },
  { href: "/laporan", label: "Laporan", Icon: IconLaporan },
  { href: "/kas-bank", label: "Kas & Bank", Icon: IconKasBank },
  { href: "/akun", label: "Akun", Icon: IconAkun },
  { href: "/jurnal", label: "Jurnal Umum", Icon: IconJurnal },
];

const salesItems = [
  { label: "Overview", Icon: IconSubOverview },
  { label: "Tagihan", Icon: IconSubTagihan },
  { label: "Pengiriman", Icon: IconSubPengiriman },
  { label: "Pemesanan", Icon: IconSubPemesanan },
  { label: "Penawaran", Icon: IconSubPenawaran },
];

const purchaseItems = [
  { label: "Overview", Icon: IconSubOverview },
  { label: "Tagihan Pembelian", Icon: IconSubTagihan },
  { label: "Pengiriman Pembelian", Icon: IconSubPengiriman },
  { label: "Pesanan Pembelian", Icon: IconSubPemesanan },
];

function getBreadcrumbLabel(pathname: string) {
  if (pathname === "/") return "Ringkasan";
  if (pathname.startsWith("/pembelian")) return "Pembelian";
  if (pathname.startsWith("/biaya")) return "Biaya";
  if (pathname.startsWith("/produk")) return "Produk";
  if (pathname.startsWith("/inventori")) return "Inventori";
  if (pathname.startsWith("/kas-bank")) return "Kas & Bank";
  if (pathname.startsWith("/akun")) return "Akun / COA";
  if (pathname.startsWith("/jurnal")) return "Jurnal Umum";
  if (pathname.startsWith("/kontak")) return "Kontak";
  if (pathname.startsWith("/laporan")) return "Laporan";
  if (pathname.startsWith("/pengaturan/promo")) return "Pengaturan Promo";
  if (pathname.startsWith("/pengaturan")) return "Pengaturan";
  return "KASKU";
}

export function AppShell({ companyName, userName, isDemo, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [clearingDemo, setClearingDemo] = useState(false);
  const [salesOpen, setSalesOpen] = useState(pathname.startsWith("/penjualan"));
  const [purchaseOpen, setPurchaseOpen] = useState(pathname.startsWith("/pembelian"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("kasku_sidebar_collapsed") === "true") {
        setCollapsed(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("kasku_sidebar_collapsed", String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }
  const [menuQuery, setMenuQuery] = useState("");
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState("");
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyDemo, setNewCompanyDemo] = useState(false);

  async function toggleCompanyDropdown() {
    const next = !companyDropdownOpen;
    setCompanyDropdownOpen(next);
    if (next && companies.length === 0) {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const d = await res.json();
        setCompanies(d.companies || []);
        setCurrentCompanyId(d.currentCompanyId || "");
      }
    }
  }

  async function switchCompany(companyId: string) {
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "switch", companyId }),
    });
    if (res.ok) {
      setCurrentCompanyId(companyId);
      setCompanyDropdownOpen(false);
      router.refresh();
    }
  }

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: newCompanyName, withDemo: newCompanyDemo }),
    });
    if (res.ok) {
      const d = await res.json();
      setCompanies((prev) => [...prev, d.company]);
      setCurrentCompanyId(d.company.id);
      setNewCompanyName("");
      setShowNewCompany(false);
      setCompanyDropdownOpen(false);
      router.refresh();
    }
  }

  async function handleClearDemo() {
    if (!confirm("Hapus semua data demo (kontak & jurnal contoh) untuk mulai pembukuan bersih?")) {
      return;
    }
    setClearingDemo(true);
    try {
      const res = await fetch("/api/company/clear-demo", { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setClearingDemo(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const q = menuQuery.trim().toLowerCase();
  const filteredNav = navItems.filter((item) => !q || item.label.toLowerCase().includes(q));
  const showSales = !q || "penjualan".includes(q) || salesItems.some((s) => s.label.toLowerCase().includes(q));
  const showPurchases = !q || "pembelian".includes(q) || purchaseItems.some((s) => s.label.toLowerCase().includes(q));

  return (
    <div className="kledo-app-shell">
      {/* Mobile Drawer (Matches Kledo Mobile App) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Dark Backdrop */}
        <div
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />

        {/* Blue Sidebar Drawer */}
        <aside
          className={`absolute inset-y-0 left-0 w-[285px] max-w-[85vw] bg-gradient-to-b from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] text-white shadow-2xl flex flex-col justify-between overflow-y-auto transform transition-transform duration-300 ease-out z-10 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-5">
            {/* Brand Row with Stylized Logo and Close Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-2xl font-black tracking-tight text-white select-none">
                <span>kas</span>
                <div className="flex flex-col gap-1 justify-center py-0.5">
                  <span className="w-5 h-1 bg-white rounded-full opacity-90" />
                  <span className="w-4 h-1 bg-white rounded-full opacity-90" />
                  <span className="w-5 h-1 bg-white rounded-full" />
                </div>
                <span>ku</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                aria-label="Tutup menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* User Name */}
            <div className="text-xl font-extrabold tracking-wide text-white mb-2 uppercase">
              {userName}
            </div>

            {/* Company Switcher Pill */}
            <div className="relative mb-5">
              <button
                type="button"
                onClick={toggleCompanyDropdown}
                className="w-full bg-white text-blue-700 font-semibold px-4 py-2.5 rounded-full flex items-center justify-between text-xs shadow-md active:scale-98 transition"
              >
                <span className="truncate pr-2">{companyName}</span>
                <ChevronDown size={15} className="text-blue-700 flex-shrink-0" />
              </button>

              {/* Company Switcher Dropdown */}
              {companyDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl py-2 z-50 text-slate-800 text-xs">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Ganti Perusahaan
                  </div>
                  {companies.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        switchCompany(c.id);
                        setMobileOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between ${
                        c.id === currentCompanyId
                          ? "bg-blue-50 text-blue-600 font-bold"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {c.id === currentCompanyId && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1 px-2">
                    <Link
                      href="/perusahaan"
                      onClick={() => {
                        setCompanyDropdownOpen(false);
                        setMobileOpen(false);
                      }}
                      className="block px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg"
                    >
                      Daftar Perusahaan
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setCompanyDropdownOpen(false);
                        setShowNewCompany(true);
                        setMobileOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-blue-600 font-semibold hover:bg-slate-50 rounded-lg"
                    >
                      + Tambah Perusahaan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1">
              {/* Beranda (Yellow when active on /) */}
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-semibold text-sm transition ${
                  pathname === "/"
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <Home size={19} className={pathname === "/" ? "text-yellow-300" : "text-white"} />
                <span>Beranda</span>
              </Link>

              {/* Penjualan (Expandable) */}
              <div>
                <button
                  type="button"
                  onClick={() => setSalesOpen((v) => !v)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    pathname.startsWith("/penjualan")
                      ? "text-yellow-300 font-bold"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <ShoppingBag size={19} className={pathname.startsWith("/penjualan") ? "text-yellow-300" : "text-white"} />
                    <span>Penjualan</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${salesOpen ? "rotate-180 text-white" : "text-white/70"}`}
                  />
                </button>
                {salesOpen && (
                  <div className="pl-10 pr-2 py-1 space-y-1">
                    {salesItems.map((item) => (
                      <Link
                        key={item.label}
                        href="/penjualan"
                        onClick={() => setMobileOpen(false)}
                        className="block py-1.5 text-xs text-white/80 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Pembelian (Expandable) */}
              <div>
                <button
                  type="button"
                  onClick={() => setPurchaseOpen((v) => !v)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    pathname.startsWith("/pembelian")
                      ? "text-yellow-300 font-bold"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <ShoppingCart size={19} className={pathname.startsWith("/pembelian") ? "text-yellow-300" : "text-white"} />
                    <span>Pembelian</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${purchaseOpen ? "rotate-180 text-white" : "text-white/70"}`}
                  />
                </button>
                {purchaseOpen && (
                  <div className="pl-10 pr-2 py-1 space-y-1">
                    {purchaseItems.map((item) => (
                      <Link
                        key={item.label}
                        href="/pembelian"
                        onClick={() => setMobileOpen(false)}
                        className="block py-1.5 text-xs text-white/80 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Biaya */}
              <Link
                href="/biaya"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  pathname.startsWith("/biaya")
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <Wallet size={19} className={pathname.startsWith("/biaya") ? "text-yellow-300" : "text-white"} />
                <span>Biaya</span>
              </Link>

              {/* Produk */}
              <Link
                href="/produk"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  pathname.startsWith("/produk")
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <Package size={19} className={pathname.startsWith("/produk") ? "text-yellow-300" : "text-white"} />
                <span>Produk</span>
              </Link>

              {/* Inventori */}
              <Link
                href="/inventori"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  pathname.startsWith("/inventori")
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <Boxes size={19} className={pathname.startsWith("/inventori") ? "text-yellow-300" : "text-white"} />
                <span>Inventori</span>
              </Link>

              {/* Laporan */}
              <Link
                href="/laporan"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  pathname.startsWith("/laporan")
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <BarChart3 size={19} className={pathname.startsWith("/laporan") ? "text-yellow-300" : "text-white"} />
                <span>Laporan</span>
              </Link>

              {/* Kas & Bank */}
              <Link
                href="/kas-bank"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  pathname.startsWith("/kas-bank")
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <CreditCard size={19} className={pathname.startsWith("/kas-bank") ? "text-yellow-300" : "text-white"} />
                <span>Kas &amp; Bank</span>
              </Link>

              {/* Akun */}
              <Link
                href="/akun"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  pathname.startsWith("/akun")
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <BookOpen size={19} className={pathname.startsWith("/akun") ? "text-yellow-300" : "text-white"} />
                <span>Akun</span>
              </Link>

              {/* Aset Tetap */}
              <Link
                href="/akun"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  pathname === "/aset-tetap"
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <Building2 size={19} className={pathname === "/aset-tetap" ? "text-yellow-300" : "text-white"} />
                <span>Aset Tetap</span>
              </Link>

              {/* Kontak */}
              <Link
                href="/kontak"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  pathname.startsWith("/kontak")
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <Users size={19} className={pathname.startsWith("/kontak") ? "text-yellow-300" : "text-white"} />
                <span>Kontak</span>
              </Link>

              {/* Pengaturan Promo */}
              <Link
                href="/pengaturan/promo"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  pathname.startsWith("/pengaturan/promo")
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <Tag size={19} className={pathname.startsWith("/pengaturan/promo") ? "text-yellow-300" : "text-white"} />
                <span>Pengaturan Promo</span>
              </Link>

              {/* Pengaturan */}
              <Link
                href="/pengaturan"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  pathname.startsWith("/pengaturan")
                    ? "text-yellow-300 font-bold"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                <Settings size={19} className={pathname.startsWith("/pengaturan") ? "text-yellow-300" : "text-white"} />
                <span>Pengaturan</span>
              </Link>
            </nav>
          </div>

          {/* Drawer Footer with Logout */}
          <div className="p-4 border-t border-white/10 mt-auto">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition"
            >
              <LogOut size={18} />
              <span>Keluar</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`kledo-sidebar print:hidden hidden lg:flex ${collapsed ? "is-collapsed" : ""}`}>
        <div className="kledo-brand-row">
          <div className="kledo-logo">
            {collapsed ? (
              <>
                K<span>K</span>
              </>
            ) : (
              <>
                KAS<span>KU</span>
              </>
            )}
          </div>
          {!collapsed && (
            <div className="kledo-company-block">
              <strong>{companyName}</strong>
              <span>UMKM Cloud</span>
            </div>
          )}
          <button
            type="button"
            className="kledo-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            <PanelLeft size={16} />
          </button>
          <button className="kledo-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
            <ChevronRight size={18} />
          </button>
        </div>

        {!collapsed && (
          <div className="kledo-search">
            <Search size={15} />
            <input
              type="text"
              value={menuQuery}
              onChange={(e) => setMenuQuery(e.target.value)}
              placeholder="Cari menu..."
              aria-label="Cari menu"
            />
          </div>
        )}

        <nav className="kledo-sidebar-nav">
          {(!q || "beranda".includes(q)) && (
            <Link
              href="/"
              title={collapsed ? "Beranda" : undefined}
              className={`kledo-nav-item ${pathname === "/" ? "kledo-nav-item-active" : ""}`}
            >
              <IconBeranda />
              {!collapsed && <span>Beranda</span>}
            </Link>
          )}

          {showSales && (
            <>
              <button
                type="button"
                title={collapsed ? "Penjualan" : undefined}
                className={`kledo-nav-item kledo-section-trigger ${pathname.startsWith("/penjualan") ? "kledo-nav-item-active" : ""}`}
                onClick={() => {
                  if (collapsed) {
                    router.push("/penjualan");
                  } else {
                    setSalesOpen((value) => !value);
                  }
                }}
              >
                <span className="kledo-nav-leading">
                  <IconPenjualan />
                  {!collapsed && <span>Penjualan</span>}
                </span>
                {collapsed ? (
                  <ChevronDown size={11} className="kledo-collapsed-chevron" />
                ) : salesOpen ? (
                  <ChevronDown size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
              </button>

              {!collapsed && salesOpen && (
                <div className="kledo-subnav">
                  {salesItems.map(({ label, Icon }) => (
                    <Link
                      key={label}
                      href="/penjualan"
                      className={`kledo-subnav-item ${
                        pathname === "/penjualan" && label === "Tagihan" ? "kledo-subnav-active" : ""
                      }`}
                    >
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {showPurchases && (
            <>
              <button
                type="button"
                title={collapsed ? "Pembelian" : undefined}
                className={`kledo-nav-item kledo-section-trigger ${pathname.startsWith("/pembelian") ? "kledo-nav-item-active" : ""}`}
                onClick={() => {
                  if (collapsed) {
                    router.push("/pembelian");
                  } else {
                    setPurchaseOpen((value) => !value);
                  }
                }}
              >
                <span className="kledo-nav-leading">
                  <IconPembelian />
                  {!collapsed && <span>Pembelian</span>}
                </span>
                {collapsed ? (
                  <ChevronDown size={11} className="kledo-collapsed-chevron" />
                ) : purchaseOpen ? (
                  <ChevronDown size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
              </button>

              {!collapsed && purchaseOpen && (
                <div className="kledo-subnav">
                  {purchaseItems.map(({ label, Icon }) => (
                    <Link
                      key={label}
                      href="/pembelian"
                      className={`kledo-subnav-item ${
                        pathname === "/pembelian" && label === "Tagihan Pembelian" ? "kledo-subnav-active" : ""
                      }`}
                    >
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {filteredNav.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`kledo-nav-item ${pathname.startsWith(href) ? "kledo-nav-item-active" : ""}`}
            >
              <Icon />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        <div className="kledo-sidebar-bottom">
          <Link
            href="/kontak"
            title={collapsed ? "Kontak" : undefined}
            className={`kledo-nav-item ${pathname.startsWith("/kontak") ? "kledo-nav-item-active" : ""}`}
          >
            <IconKontak />
            {!collapsed && <span>Kontak</span>}
          </Link>
          <Link
            href="/pengaturan"
            title={collapsed ? "Pengaturan" : undefined}
            className={`kledo-nav-item ${pathname.startsWith("/pengaturan") ? "kledo-nav-item-active" : ""}`}
          >
            <IconPengaturan />
            {!collapsed && <span>Pengaturan</span>}
          </Link>
          <div className="kledo-profile">
            <div className="kledo-avatar" title={collapsed ? `${userName} (${companyName})` : undefined}>
              {userName.slice(0, 1).toUpperCase()}
            </div>
            {!collapsed && (
              <div>
                <strong>{userName}</strong>
                <span>{companyName}</span>
              </div>
            )}
            <button onClick={handleLogout} aria-label="Keluar" title="Keluar">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="kledo-main-column">
        {/* Mobile Header (Royal Blue Kledo Style - Matches Screenshot 1) */}
        <header className="lg:hidden bg-gradient-to-r from-blue-700 via-blue-700 to-blue-800 text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs print:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1 -ml-1 rounded-lg text-white hover:bg-white/10 active:scale-95 transition"
            aria-label="Buka menu"
          >
            <Menu size={22} />
          </button>
          <div className="font-bold text-white text-base tracking-tight truncate max-w-[210px] text-center">
            {pathname === "/" ? companyName : getBreadcrumbLabel(pathname)}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1.5 rounded-lg text-white/90 hover:bg-white/10"
              aria-label="Filter"
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg text-white/90 hover:bg-white/10 relative"
              aria-label="Notifikasi"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="kledo-topbar hidden lg:flex print:hidden">
          <button className="kledo-menu-button" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
            <Menu size={20} />
          </button>

          <div className="kledo-quick-actions">
            <Link href="/penjualan" className="kledo-quick-action">
              <IconPenjualan />
              <span>Jual</span>
            </Link>
            <Link href="/pembelian" className="kledo-quick-action">
              <IconPembelian />
              <span>Beli</span>
            </Link>
            <Link href="/biaya" className="kledo-quick-action">
              <IconBiaya />
              <span>Biaya</span>
            </Link>
            <Link href="/kasir" className="kledo-quick-action">
              <IconKasBank />
              <span>Kasir</span>
            </Link>
          </div>

          <div className="kledo-topbar-spacer" />

          <div className="relative">
            <button
              type="button"
              onClick={toggleCompanyDropdown}
              className="kledo-topbar-company cursor-pointer hover:text-blue-600"
            >
              {companyName}
              <ChevronDown size={14} />
            </button>
            {companyDropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-40 text-sm">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => switchCompany(c.id)}
                    className={`w-full text-left px-4 py-2.5 transition truncate ${
                      c.id === currentCompanyId
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <Link
                    href="/perusahaan"
                    onClick={() => setCompanyDropdownOpen(false)}
                    className="block w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Daftar Perusahaan
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyDropdownOpen(false);
                      setShowNewCompany(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-slate-50"
                  >
                    + Tambah Perusahaan
                  </button>
                </div>
              </div>
            )}
          </div>
          <button type="button" className="kledo-language">
            ID <ChevronDown size={12} />
          </button>
          <button type="button" className="kledo-top-icon" aria-label="Bantuan">
            <CircleHelp size={17} />
          </button>
          <button type="button" className="kledo-top-icon kledo-notification" aria-label="Notifikasi">
            <Bell size={17} />
            <i />
          </button>
          <div className="kledo-theme-toggle" aria-hidden="true">
            <span />
            <Sun size={14} />
          </div>
          <div className="kledo-top-avatar">{userName.slice(0, 1).toUpperCase()}</div>
        </header>

        {isDemo && (
          <div className="kledo-demo-banner print:hidden">
            <span>
              <strong>Mode Data Demo:</strong> Anda sedang melihat data contoh KASKU. Hapus data demo saat siap mencatat pembukuan asli.
            </span>
            <button onClick={handleClearDemo} disabled={clearingDemo} className="kledo-demo-button">
              <Trash2 className="w-3.5 h-3.5" />
              {clearingDemo ? "Menghapus..." : "Hapus Data Demo"}
            </button>
          </div>
        )}

        <main className={`kledo-content ${pathname === "/" ? "p-0! lg:p-6!" : ""}`}>
          {pathname !== "/" && (
            <div className="kledo-breadcrumb hidden lg:flex print:hidden">
              <Link href="/">Beranda</Link>
              <span>·</span>
              {pathname.startsWith("/penjualan") ? (
                <>
                  <Link href="/penjualan">Penjualan</Link>
                  <span>·</span>
                  <strong>Tagihan</strong>
                </>
              ) : (
                <strong>{getBreadcrumbLabel(pathname)}</strong>
              )}
            </div>
          )}
          {children}
        </main>
      </div>

      {showNewCompany && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Tambah Perusahaan Baru</h2>
            <form onSubmit={createCompany} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Perusahaan
                </label>
                <input
                  required
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Contoh: PT Sarana Berusaha"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={newCompanyDemo}
                  onChange={(e) => setNewCompanyDemo(e.target.checked)}
                />
                <span>Sertakan data demo</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCompany(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Buat & Beralih
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
