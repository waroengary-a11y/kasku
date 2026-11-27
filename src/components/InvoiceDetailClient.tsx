"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Printer, Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { PrintableDocument } from "@/components/PrintableDocument";

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

interface InvoiceDetail {
  id: string;
  invoiceNo: string;
  transDate: string;
  dueDate: string;
  status: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  notes: string | null;
  contact: { id: string; name: string; email: string | null; phone: string | null; address: string | null };
  items: Array<{
    id: string;
    description: string;
    qty: number;
    unitPrice: number;
    taxRate: number;
    lineTotal: number;
  }>;
}

const money = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);

const numFmt = (v: number) => Math.round(Number(v) || 0).toLocaleString("id-ID");

export function InvoiceDetailClient({
  company,
  invoice,
  payments,
  cashAccounts,
  initialDate,
}: {
  company: { name: string; address: string | null; phone: string | null; email: string | null };
  invoice: InvoiceDetail;
  payments: PaymentHistory[];
  cashAccounts: Array<{ id: string; name: string; balance: number }>;
  initialDate: string;
}) {
  const router = useRouter();
  const [cashAccountId, setCashAccountId] = useState(cashAccounts[0]?.id || "");
  const [paymentDate, setPaymentDate] = useState(initialDate);
  const [amount, setAmount] = useState(String(Math.round(invoice.balanceDue)));
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("Transfer Bank");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAmount(String(Math.round(invoice.balanceDue)));
  }, [invoice.balanceDue]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/invoices/${invoice.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cashAccountId,
          paymentDate,
          amount: Number(amount),
          method: reference ? `${method} (${reference})` : method,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal mencatat pembayaran.");
        return;
      }
      setReference("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Hapus tagihan penjualan ini beserta jurnal dan mutasi stoknya?")) return;
    const res = await fetch(`/api/sales/invoices/${invoice.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Gagal menghapus tagihan.");
      return;
    }
    router.push("/penjualan");
    router.refresh();
  }

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800",
    PARTIAL: "bg-orange-100 text-orange-800",
    PAID: "bg-green-100 text-green-800",
    VOID: "bg-red-100 text-red-800",
  };
  const statusLabels: Record<string, string> = {
    OPEN: "Belum Lunas",
    PARTIAL: "Dibayar Sebagian",
    PAID: "Lunas",
    VOID: "Dibatalkan",
  };

  const totalQty = invoice.items.reduce((s, it) => s + Number(it.qty), 0);

  return (
    <>
      <PrintableDocument
        docTitle="Invoice"
        docNo={invoice.invoiceNo}
        transDate={invoice.transDate}
        dueDate={invoice.dueDate}
        company={company}
        contactLabel="Tagihan Kepada"
        contact={invoice.contact}
        items={invoice.items.map((it) => ({
          id: it.id,
          description: it.description,
          qty: it.qty,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
          lineTotal: it.lineTotal,
        }))}
        subtotal={invoice.subtotal}
        grandTotal={invoice.grandTotal}
        payments={payments.map((p) => ({
          id: p.id,
          paymentNo: p.payment.paymentNo,
          paymentDate: p.payment.paymentDate,
          method: p.payment.method,
          allocatedAmount: p.allocatedAmount,
        }))}
        balanceDue={invoice.balanceDue}
      />
      <div className="space-y-5 print:hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/penjualan"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Penjualan
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">{invoice.invoiceNo}</h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${statusColors[invoice.status] || "bg-slate-100"}`}>
                {statusLabels[invoice.status] || invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">Pelanggan: {invoice.contact.name}</p>
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
          {invoice.status !== "VOID" && (
            <Link
              href={`/penjualan/${invoice.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Link>
          )}
          {invoice.status === "OPEN" && invoice.paidAmount === 0 && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" />
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* Invoice Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm pb-4 border-b border-slate-100">
          <div>
            <div className="text-xs text-slate-400">Pelanggan</div>
            <div className="font-semibold text-blue-600">{invoice.contact.name}</div>
            <div className="text-xs text-slate-500">{invoice.contact.address || invoice.contact.phone || ""}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Tanggal Transaksi</div>
            <div className="font-medium text-slate-900">
              {new Date(invoice.transDate).toLocaleDateString("id-ID")}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Jatuh Tempo</div>
            <div className="font-medium text-slate-900">
              {new Date(invoice.dueDate).toLocaleDateString("id-ID")}
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Produk / Deskripsi</th>
              <th className="px-4 py-2.5 text-right">Kuantitas</th>
              <th className="px-4 py-2.5 text-right">Harga</th>
              <th className="px-4 py-2.5 text-right">Pajak</th>
              <th className="px-4 py-2.5 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3 text-blue-600 font-medium">{it.description}</td>
                <td className="px-4 py-3 text-right">{it.qty}</td>
                <td className="px-4 py-3 text-right">{numFmt(it.unitPrice)}</td>
                <td className="px-4 py-3 text-right">{it.taxRate > 0 ? `${it.taxRate}%` : ""}</td>
                <td className="px-4 py-3 text-right font-medium">{numFmt(it.lineTotal)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50/50 font-semibold text-slate-800">
              <td className="px-4 py-2.5 text-right">Total Kuantitas</td>
              <td className="px-4 py-2.5 text-right">{totalQty}</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="font-medium text-slate-600">Sub Total</span>
              <span className="font-semibold">{numFmt(invoice.subtotal)}</span>
            </div>
            {invoice.subtotal + invoice.taxTotal - invoice.grandTotal > 0 && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-rose-600">
                <span className="font-medium">Potongan / Komisi / Diskon</span>
                <span className="font-semibold">
                  - {numFmt(invoice.subtotal + invoice.taxTotal - invoice.grandTotal)}
                </span>
              </div>
            )}
            {invoice.taxTotal > 0 && (
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-600">Pajak</span>
                <span className="font-semibold">{numFmt(invoice.taxTotal)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-slate-100 font-bold text-slate-900">
              <span>{invoice.notes?.includes("[Kasir ") ? "Penerimaan Bersih (Net)" : "Total"}</span>
              <span>{numFmt(invoice.grandTotal)}</span>
            </div>
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-emerald-600 font-medium">
                <span>Sudah Dibayar</span>
                <span>{numFmt(invoice.paidAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-lg font-bold text-slate-900">
              <span>Sisa Tagihan</span>
              <span>{numFmt(invoice.balanceDue)}</span>
            </div>
            {invoice.notes && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-700 block mb-0.5">Catatan / Rincian Channel:</span>
                {invoice.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Terima Pembayaran Card (Gaya Kledo — tampil langsung saat masih ada Sisa Tagihan) */}
      {(invoice.status === "OPEN" || invoice.status === "PARTIAL") && (
        <form onSubmit={handlePay} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            Terima pembayaran
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
                <span className="text-red-500">*</span> Dibayar Ke
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

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Referensi</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Referensi"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Metode</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="Tunai">Tunai</option>
                <option value="QRIS">QRIS</option>
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
          <p className="text-sm text-slate-500">Belum ada pembayaran untuk tagihan ini.</p>
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

      {/* Pantau log perubahan data */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
        <h3 className="text-sm font-bold text-slate-900">Pantau log perubahan data</h3>
        <p className="text-xs text-blue-600">
          Tagihan {invoice.invoiceNo} dicatat pada {new Date(invoice.transDate).toLocaleDateString("id-ID")}
        </p>
      </div>
    </div>
    </>
  );
}
