"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface CompanyInfo {
  name: string;
  npwp: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lockDate: string | null;
  numberSequences: Array<{ docType: string; prefix: string; nextNumber: number }>;
  taxes: Array<{ id: string; name: string; rate: number; type: string }>;
  paymentTerms: Array<{ id: string; name: string; days: number }>;
  accountMappings: Array<{ mappingKey: string; account: { code: string; name: string } }>;
}

interface UserInfo {
  name: string;
  email: string;
}

export function SettingsClient({ company, user }: { company: CompanyInfo; user: UserInfo }) {
  const router = useRouter();
  const [name, setName] = useState(company.name);
  const [npwp, setNpwp] = useState(company.npwp || "");
  const [phone, setPhone] = useState(company.phone || "");
  const [email, setEmail] = useState(company.email || "");
  const [address, setAddress] = useState(company.address || "");
  const [lockDate, setLockDate] = useState(
    company.lockDate ? company.lockDate.slice(0, 10) : ""
  );
  const [saved, setSaved] = useState(false);

  const [userName, setUserName] = useState(user.name);
  const [userEmail, setUserEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [accountError, setAccountError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const res = await fetch("/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        npwp,
        phone,
        email,
        address,
        lockDate: lockDate || null,
      }),
    });
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountSaved(false);
    setAccountError("");

    if (newPassword && newPassword.length < 6) {
      setAccountError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setAccountError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setSavingAccount(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAccountError(data.error || "Gagal memperbarui akun.");
        return;
      }
      setAccountSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch {
      setAccountError("Terjadi kesalahan jaringan.");
    } finally {
      setSavingAccount(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
          <p className="text-sm text-slate-500">
            Profil perusahaan, akun login (email & password), tanggal penguncian periode, pajak, dan penomoran otomatis.
          </p>
        </div>
        <Link
          href="/pengaturan/promo"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Pengaturan Promo &amp; Komisi Aplikasi</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <h2 className="font-semibold text-slate-900">Profil & Penguncian Periode</h2>
          {saved && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
              Pengaturan perusahaan berhasil disimpan.
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Perusahaan
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">NPWP</label>
              <input
                value={npwp}
                onChange={(e) => setNpwp(e.target.value)}
                placeholder="00.000.000.0-000.000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Telepon</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Alamat</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Tanggal Penguncian (Lock Date)
            </label>
            <input
              type="date"
              value={lockDate}
              onChange={(e) => setLockDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Transaksi pada atau sebelum tanggal ini tidak dapat diposting.
            </p>
          </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Simpan Pengaturan
            </button>
          </form>

          <form
            id="akun"
            onSubmit={handleSaveAccount}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <div>
              <h2 className="font-semibold text-slate-900">Akun Saya (Email & Password)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ubah nama pengguna, email login, atau password akun Anda.
              </p>
            </div>
            {accountSaved && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                Profil akun berhasil diperbarui.
              </div>
            )}
            {accountError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {accountError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Pengguna
              </label>
              <input
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Login
              </label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Wajib diisi jika mengubah email atau password"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak diubah"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={savingAccount}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
            >
              {savingAccount ? "Menyimpan..." : "Simpan Perubahan Akun"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-3">Penomoran Otomatis</h2>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {company.numberSequences.map((s) => (
                <div
                  key={s.docType}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="font-semibold text-slate-700">{s.docType}</div>
                  <div className="font-mono text-slate-500">
                    {s.prefix}
                    {String(s.nextNumber).padStart(4, "0")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-900 mb-3">Mapping Akun Default</h2>
            <div className="space-y-2 text-xs">
              {company.accountMappings.map((m) => (
                <div
                  key={m.mappingKey}
                  className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0"
                >
                  <span className="font-mono text-slate-500">{m.mappingKey}</span>
                  <span className="font-medium text-slate-800">
                    {m.account.code} — {m.account.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-2 gap-4 text-xs">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Termin Pembayaran</h3>
              <ul className="space-y-1 text-slate-600">
                {company.paymentTerms.map((t) => (
                  <li key={t.id}>
                    {t.name} ({t.days} hari)
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Tarif Pajak</h3>
              <ul className="space-y-1 text-slate-600">
                {company.taxes.map((t) => (
                  <li key={t.id}>
                    {t.name} ({t.rate}%)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
