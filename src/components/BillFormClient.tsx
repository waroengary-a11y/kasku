"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";
import {
  InvoiceSummaryExtras,
  computeExtrasTotals,
  type SummaryExtrasState,
} from "@/components/InvoiceSummaryExtras";

interface ContactOpt {
  id: string;
  name: string;
}

interface ProductOpt {
  id: string;
  sku: string;
  name: string;
  unit: string;
  buyPrice: number;
}

interface TermOpt {
  id: string;
  name: string;
  days: number;
}

interface TaxOpt {
  id: string;
  name: string;
  rate: number;
}

interface LineItem {
  productId: string;
  description: string;
  qty: string;
  unit: string;
  unitCost: string;
  taxRate: string;
  lineTotalOverride?: string;
}

const money = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function BillFormClient({
  mode,
  billId,
  initialNo,
  initialContactId,
  initialTransDate,
  initialDueDate,
  initialItems,
  initialExtras,
  contacts,
  products,
  terms,
  taxes,
}: {
  mode: "create" | "edit";
  billId?: string;
  initialNo: string;
  initialContactId: string;
  initialTransDate: string;
  initialDueDate: string;
  initialItems?: LineItem[];
  initialExtras?: Partial<SummaryExtrasState>;
  contacts: ContactOpt[];
  products: ProductOpt[];
  terms: TermOpt[];
  taxes: TaxOpt[];
}) {
  const router = useRouter();
  const [contactId, setContactId] = useState(initialContactId || "");
  const [transDate, setTransDate] = useState(initialTransDate);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [selectedTermId, setSelectedTermId] = useState(terms[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extras, setExtras] = useState<SummaryExtrasState>({
    extraDiscountType: initialExtras?.extraDiscountType || "rp",
    extraDiscountValue: initialExtras?.extraDiscountValue || "0",
    shippingFee: initialExtras?.shippingFee || "0",
    transactionFee: initialExtras?.transactionFee || "0",
    withholdings: initialExtras?.withholdings || [],
    downPayment: initialExtras?.downPayment || "0",
  });

  const [items, setItems] = useState<LineItem[]>(
    initialItems && initialItems.length > 0
      ? initialItems.map((it) => ({ ...it, lineTotalOverride: undefined }))
      : [{ productId: "", description: "", qty: "1", unit: "pcs", unitCost: "0", taxRate: "0" }]
  );

  function handleTermChange(termId: string) {
    setSelectedTermId(termId);
    const t = terms.find((x) => x.id === termId);
    if (t && transDate) setDueDate(addDays(transDate, t.days));
  }

  function updateItem(idx: number, field: keyof LineItem, val: string) {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    if (field === "productId") {
      const p = products.find((x) => x.id === val);
      if (p) {
        next[idx].description = p.name;
        next[idx].unit = p.unit || "pcs";
        next[idx].unitCost = String(p.buyPrice);
        next[idx].lineTotalOverride = undefined;
      }
    }
    // Ketika qty, unitCost, atau pajak berubah → reset override
    if (field === "qty" || field === "unitCost" || field === "taxRate") {
      next[idx].lineTotalOverride = undefined;
    }
    // Ketika lineTotalOverride diketik → hitung mundur unitCost
    if (field === "lineTotalOverride") {
      const totalRaw = Number(val) || 0;
      const qty = Number(next[idx].qty) || 1;
      const taxRate = Number(next[idx].taxRate) || 0;
      if (totalRaw > 0) {
        const net = totalRaw / (1 + taxRate / 100);
        const unitCost = net / qty;
        next[idx].unitCost = String(Math.round(unitCost));
      } else {
        next[idx].unitCost = "0";
      }
    }
    setItems(next);
  }

  const lineComputations = items.map((it) => {
    const qty = Number(it.qty) || 0;
    const cost = Number(it.unitCost) || 0;
    const net = qty * cost;
    const tax = net * ((Number(it.taxRate) || 0) / 100);
    const computedTotal = net + tax;
    const total =
      it.lineTotalOverride !== undefined ? Number(it.lineTotalOverride) || 0 : computedTotal;
    return { net, tax, total, computedTotal };
  });

  const subtotal = lineComputations.reduce((s, c) => s + c.net, 0);
  const taxTotal = lineComputations.reduce((s, c) => s + c.tax, 0);
  const extrasTotals = computeExtrasTotals(subtotal, taxTotal, extras);
  const grandTotal = extrasTotals.total;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (!contactId) {
        setError("Pilih supplier terlebih dahulu.");
        return;
      }
      const payload = {
        contactId,
        transDate,
        dueDate,
        extraDiscount: extrasTotals.extraDiscount,
        shippingFee: extrasTotals.shipping,
        transactionFee: extrasTotals.txFee,
        withholding: extrasTotals.withholding,
        downPayment: extrasTotals.downPayment,
        items: items.map((it) => ({
          productId: it.productId || null,
          description:
            it.description || products.find((p) => p.id === it.productId)?.name || "Item Pembelian",
          qty: Number(it.qty) || 1,
          unitCost: Number(it.unitCost) || 0,
          taxRate: Number(it.taxRate) || 0,
        })),
      };

      const res = await fetch(
        mode === "edit" ? `/api/purchases/invoices/${billId}` : "/api/purchases/invoices",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Gagal menyimpan tagihan pembelian.");
        return;
      }
      const targetId = mode === "edit" ? billId : data.invoice?.id;
      router.push(targetId ? `/pembelian/${targetId}` : "/pembelian");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === "edit" ? `Edit Tagihan Pembelian ${initialNo}` : "Tambah Tagihan Pembelian"}
        </h1>
        <Link
          href={mode === "edit" && billId ? `/pembelian/${billId}` : "/pembelian"}
          className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
        >
          Kembali
        </Link>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <span className="text-red-500">*</span> Supplier / Vendor
            </label>
            <select
              required
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">— Pilih Supplier —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nomor</label>
            <input
              disabled
              value={initialNo}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              <span className="text-red-500">*</span> Tgl. Transaksi
            </label>
            <input
              type="date"
              required
              value={transDate}
              onChange={(e) => setTransDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tgl. Jatuh Tempo</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Termin</label>
            <select
              value={selectedTermId}
              onChange={(e) => handleTermChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile Stacked Item Cards */}
        <div className="block lg:hidden space-y-3">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Item #{idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50"
                    aria-label="Hapus item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Produk</label>
                <select
                  value={it.productId}
                  onChange={(e) => updateItem(idx, "productId", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                >
                  <option value="">Pilih Produk</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Deskripsi</label>
                <input
                  value={it.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  placeholder="Deskripsi item"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kuantitas</label>
                  <input
                    type="number"
                    min="1"
                    value={it.qty}
                    onChange={(e) => updateItem(idx, "qty", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-right"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Satuan</label>
                  <input
                    value={it.unit}
                    onChange={(e) => updateItem(idx, "unit", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Harga Beli</label>
                  <CurrencyInput
                    value={it.unitCost}
                    onValueChange={(v) => updateItem(idx, "unitCost", v)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-right"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pajak</label>
                  <select
                    value={it.taxRate}
                    onChange={(e) => updateItem(idx, "taxRate", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                  >
                    <option value="0">0%</option>
                    {taxes.map((tx) => (
                      <option key={tx.id} value={String(tx.rate)}>
                        {tx.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-blue-700 mb-1">Jumlah</label>
                <CurrencyInput
                  value={
                    it.lineTotalOverride !== undefined
                      ? it.lineTotalOverride
                      : String(Math.round(lineComputations[idx].total))
                  }
                  onValueChange={(v) => updateItem(idx, "lineTotalOverride", v)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm text-right bg-blue-50 font-bold text-slate-900"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Items Table */}
        <div className="hidden lg:block overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-3 w-48">Produk</th>
                <th className="px-3 py-3">Deskripsi</th>
                <th className="px-3 py-3 w-20 text-right">Kuantitas</th>
                <th className="px-3 py-3 w-24">Satuan</th>
                <th className="px-3 py-3 w-36 text-right">Harga Beli</th>
                <th className="px-3 py-3 w-28">Pajak</th>
                <th className="px-3 py-3 w-36 text-right">Jumlah</th>
                <th className="px-2 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td className="p-2">
                    <select
                      value={it.productId}
                      onChange={(e) => updateItem(idx, "productId", e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="">Pilih Produk</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      value={it.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="Deskripsi item"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="1"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, "qty", e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-right"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      value={it.unit}
                      onChange={(e) => updateItem(idx, "unit", e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <CurrencyInput
                      value={it.unitCost}
                      onValueChange={(v) => updateItem(idx, "unitCost", v)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-right"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={it.taxRate}
                      onChange={(e) => updateItem(idx, "taxRate", e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="0">0%</option>
                      {taxes.map((tx) => (
                        <option key={tx.id} value={String(tx.rate)}>
                          {tx.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-right font-medium text-slate-900 text-xs">
                    <CurrencyInput
                      value={
                        it.lineTotalOverride !== undefined
                          ? it.lineTotalOverride
                          : String(Math.round(lineComputations[idx].total))
                      }
                      onValueChange={(v) => updateItem(idx, "lineTotalOverride", v)}
                      className="w-full px-2 py-1.5 border border-blue-300 rounded-lg text-xs text-right bg-blue-50 font-semibold"
                    />
                  </td>
                  <td className="p-2 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() =>
            setItems([
              ...items,
              { productId: "", description: "", qty: "1", unit: "pcs", unitCost: "0", taxRate: "0", lineTotalOverride: "" },
            ])
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah baris
        </button>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <div className="w-full max-w-md">
            <InvoiceSummaryExtras
              subtotal={subtotal}
              taxTotal={taxTotal}
              state={extras}
              onChange={setExtras}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Link
            href={mode === "edit" && billId ? `/pembelian/${billId}` : "/pembelian"}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={saving || grandTotal <= 0}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan & Posting"}
          </button>
        </div>
      </div>
    </form>
  );
}
