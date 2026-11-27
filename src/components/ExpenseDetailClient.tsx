"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Pencil, Printer, Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";

interface PaymentHistory {
  id: string;
  allocatedAmount: number;
  payment: {
    id: string;
    paymentNo: string;
    paymentDate: string;
    amount: number;
    method: string;
  };
}

interface ExpenseDetail {
  id: string;
  expenseNo: string;
  transDate: string;
  dueDate: string | null;
  status: string;
  grandTotal: number;
  paidAmount: number;
  contact: { id: string; name: string } | null;
  items: Array<{
    id: string;
    accountName: string;
    description: string;
    amount: number;
  }>;
}

const money = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);

const numFmt = (v: number) => Math.round(Number(v) || 0).toLocaleString("id-ID");

export function ExpenseDetailClient({
  expense,
  payments,
  cashAccounts,
  initialDate,
}: {
  expense: ExpenseDetail;
  payments: PaymentHistory[];
  cashAccounts: Array<{ id: string; name: string; balance: number }>;
  initialDate: string;
}) {
  const router = useRouter();
  const balanceDue = Math.max(0, expense.grandTotal - expense.paidAmount);
  const [cashAccountId, setCashAccountId] = useState(cashAccounts[0]?.id || "");
  const [paymentDate, setPaymentDate] = useState(initialDate);
  const [amount, setAmount] = useState(String(Math.round(balanceDue)));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${expense.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cashAccountId, paymentDate, amount: Number(amount) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mencatat pembayaran.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus biaya ini? Transaksi dan jurnal pengeluaran akan dibatalkan, dan dana akan kembali ke akun kas/bank asal.")) return;
    const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Gagal menghapus biaya.");
      return;
    }
    router.push("/biaya");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/biaya"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Biaya
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">{expense.expenseNo}</h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  expense.status === "PAID"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {expense.status === "PAID" ? "Lunas" : "Belum Lunas"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Kontak: {expense.contact?.name || "Tanpa Kontak"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          {expense.paidAmount === 0 && (
            <Link
              href={`/biaya/${expense.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Link>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 hover:bg-red-100"
          >
            <Trash2 className="w-4 h-4" />
            Hapus
          </button>
        </div>
      </div>

      {/* Detail Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs text-slate-400">Kontak</div>
            <div className="font-semibold text-blue-600">{expense.contact?.name || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Tanggal Transaksi</div>
            <div className="font-medium text-slate-900">
              {new Date(expense.transDate).toLocaleDateString("id-ID")}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Jatuh Tempo</div>
            <div className="font-medium text-slate-900">
              {expense.dueDate ? new Date(expense.dueDate).toLocaleDateString("id-ID") : "—"}
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Akun Biaya</th>
              <th className="px-4 py-2.5">Deskripsi</th>
              <th className="px-4 py-2.5 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expense.items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-blue-600 font-medium">{it.accountName}</td>
                <td className="px-4 py-3 text-slate-800">{it.description}</td>
                <td className="px-4 py-3 text-right font-medium">{numFmt(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-100 font-bold text-slate-900">
              <span>Total</span>
              <span>{numFmt(expense.grandTotal)}</span>
            </div>
            {expense.paidAmount > 0 && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-emerald-600 font-medium">
                <span>Sudah Dibayar</span>
                <span>{numFmt(expense.paidAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-lg font-bold text-slate-900">
              <span>Sisa Tagihan Biaya</span>
              <span>{numFmt(balanceDue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Kirim Pembayaran */}
      {expense.status !== "PAID" && balanceDue > 0 && (
        <form onSubmit={handlePay} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            Bayar biaya
          </h2>
          {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> Total Dibayar
              </label>
              <CurrencyInput
                value={amount}
                onValueChange={setAmount}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-right"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nomor</label>
              <input
                disabled
                value="Otomatis (PAY-...)"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> Tgl. Pembayaran
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> Dibayar Dari
              </label>
              <select
                value={cashAccountId}
                onChange={(e) => setCashAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-blue-400 rounded-lg text-sm bg-white"
              >
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({money(a.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-12 text-sm font-bold text-slate-900">
              <span>Total</span>
              <span>{numFmt(Number(amount) || 0)}</span>
            </div>
            <button
              type="submit"
              disabled={loading || !(Number(amount) > 0)}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "+ Tambah Pembayaran"}
            </button>
          </div>
        </form>
      )}

      {/* Riwayat Pembayaran */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <h2 className="font-bold text-slate-900">Riwayat Pembayaran</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada pembayaran terpisah untuk biaya ini.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">No. Pembayaran</th>
                <th className="px-4 py-2">Tanggal</th>
                <th className="px-4 py-2">Metode</th>
                <th className="px-4 py-2 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-700">{p.payment.paymentNo}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {new Date(p.payment.paymentDate).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{p.payment.method}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">
                    {money(p.allocatedAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
