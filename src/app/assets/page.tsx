"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Layers,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import useMonthlySummary from "@/hooks/useMonthlySummary";
import {
  createAssetDistribution,
  getAssetDistributions,
  removeAssetDistribution,
  updateAssetDistribution,
} from "@/services/assetDistributionService";
import type { AssetDistribution, AssetDistributionPayload } from "@/types/asset";

type DistributionType = AssetDistribution["type"];
type DistributionSource = AssetDistribution["source"];

function formatMonthLabel(monthKey: string) {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getPreviousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function AssetsPage() {
  const toast = useToast();
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const previousMonthKey = useMemo(() => getPreviousMonthKey(selectedMonth), [selectedMonth]);

  const { summary: selectedSummary } = useMonthlySummary(selectedMonth);
  const { summary: previousSummary } = useMonthlySummary(previousMonthKey);

  const [records, setRecords] = useState<AssetDistribution[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailType, setDetailType] = useState<DistributionType | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<DistributionSource>("manual");
  const [editingRecord, setEditingRecord] = useState<AssetDistribution | null>(null);
  const [form, setForm] = useState({
    amount: "",
    type: "Liquid Assets" as DistributionType,
    note: "",
  });

  useEffect(() => {
    void loadRecords();
  }, [selectedMonth]);

  async function loadRecords() {
    setLoading(true);
    try {
      const data = await getAssetDistributions();
      setRecords(data);
    } catch {
      toast.showToast("Failed to load distribution records", "error");
    } finally {
      setLoading(false);
    }
  }

  const visibleRecords = useMemo(
    () => records.filter((record) => record.month === selectedMonth || record.month === previousMonthKey),
    [records, selectedMonth, previousMonthKey]
  );

  const allLiquidRecords = useMemo(
    () => records.filter((record) => record.type === "Liquid Assets"),
    [records]
  );

  const allAllocatedRecords = useMemo(
    () => records.filter((record) => record.type === "Allocated Assets"),
    [records]
  );

  const allocationRecords = useMemo(
    () => records.filter((record) => record.source === "allocation" && record.month === previousMonthKey),
    [records, previousMonthKey]
  );

  const detailRecords = useMemo(
    () => (detailType === "Liquid Assets" ? allLiquidRecords : allAllocatedRecords),
    [detailType, allLiquidRecords, allAllocatedRecords]
  );

  const availableAllocationAmount = Math.max(
    0,
    previousSummary.balance - allocationRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0)
  );

  function openCreateModal(source: DistributionSource) {
    setEditorMode(source);
    setEditingRecord(null);
    setForm({ amount: "", type: "Liquid Assets", note: "" });
    setEditorOpen(true);
  }

  function openEditModal(record: AssetDistribution) {
    setEditorMode(record.source);
    setEditingRecord(record);
    setForm({ amount: String(record.amount), type: record.type, note: record.note || "" });
    setEditorOpen(true);
  }

  async function handleSubmit() {
    const parsedAmount = Number(form.amount);

    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      toast.showToast("Please enter a valid amount.", "error");
      return;
    }

    const isEditingAllocation = editingRecord?.source === "allocation";
    const targetMonth = editingRecord ? editingRecord.month : editorMode === "allocation" ? previousMonthKey : selectedMonth;

    const newAllocationTotal = allocationRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);
    const currentEditingAmount = isEditingAllocation ? Number(editingRecord!.amount || 0) : 0;
    const proposedTotal = newAllocationTotal - currentEditingAmount + parsedAmount;

    if (editorMode === "allocation" || isEditingAllocation) {
      if (parsedAmount > 0 && proposedTotal > previousSummary.balance) {
        toast.showToast("Allocation amount cannot exceed the previous month balance.", "error");
        return;
      }
      if (!editingRecord && availableAllocationAmount === 0) {
        toast.showToast("Available allocation amount is already zero.", "error");
        return;
      }
    }

    try {
      if (editingRecord) {
        if (parsedAmount === 0 && editingRecord.source === "allocation") {
          await removeAssetDistribution(editingRecord.id);
          toast.showToast("Allocation record deleted.", "success");
        } else if (parsedAmount === 0 && editingRecord.source === "manual") {
          await removeAssetDistribution(editingRecord.id);
          toast.showToast("Manual record deleted.", "success");
        } else {
          const payload: Partial<AssetDistributionPayload> = {
            amount: parsedAmount,
            type: form.type,
            note: form.note.trim(),
            month: targetMonth,
          };
          await updateAssetDistribution(editingRecord.id, payload);
          toast.showToast("Distribution updated.", "success");
        }
      } else {
        const payload: AssetDistributionPayload = {
          month: targetMonth,
          amount: parsedAmount,
          type: form.type,
          note: form.note.trim(),
          source: editorMode,
        };
        await createAssetDistribution(payload);
        toast.showToast("Distribution added.", "success");
      }

      setEditorOpen(false);
      setEditingRecord(null);
      await loadRecords();
    } catch {
      toast.showToast("Something went wrong while saving the distribution.", "error");
    }
  }

  async function handleDelete(record: AssetDistribution) {
    if (record.source === "allocation") {
      toast.showToast("Allocation records can only be edited, not deleted.", "error");
      return;
    }

    try {
      await removeAssetDistribution(record.id);
      await loadRecords();
      toast.showToast("Distribution removed.", "success");
    } catch {
      toast.showToast("Failed to delete distribution.", "error");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 pt-4 pb-28 sm:px-6 sm:pt-6 md:px-8">
      <div className="max-w-6xl mx-auto grid gap-5">
        <section className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Layers size={18} />
                <span>Asset Management</span>
              </div>
              <h1 className="text-4xl font-bold">Distribution Dashboard</h1>
              <p className="text-zinc-400 mt-2 max-w-2xl">
                Track the previous month&apos;s balance, create allocation records, and manage distribution history without touching income or expense entries.
              </p>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-black font-bold hover:opacity-90">
              <ArrowUpRight size={18} />
              Back to Cash Flow
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <button
            onClick={() => setDetailType("Liquid Assets")}
            className="text-left bg-zinc-900 border border-cyan-500/30 rounded-3xl p-5"
          >
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <Wallet size={18} />
              Available Assets
            </div>
            <div className="text-3xl font-bold text-cyan-400">RM {allLiquidRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0).toFixed(2)}</div>
            <p className="text-sm text-zinc-400 mt-2">{allLiquidRecords.length} record{allLiquidRecords.length === 1 ? "" : "s"}</p>
          </button>

          <button
            onClick={() => setDetailType("Allocated Assets")}
            className="text-left bg-zinc-900 border border-violet-500/30 rounded-3xl p-5"
          >
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <Sparkles size={18} />
              Fixed Assets
            </div>
            <div className="text-3xl font-bold text-violet-400">RM {allAllocatedRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0).toFixed(2)}</div>
            <p className="text-sm text-zinc-400 mt-2">{allAllocatedRecords.length} record{allAllocatedRecords.length === 1 ? "" : "s"}</p>
          </button>

          <div className="bg-zinc-900 border border-emerald-500/30 rounded-3xl p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <CalendarDays size={18} />
              Balance & Allocation
            </div>
            <div className="text-3xl font-bold text-emerald-400">RM {previousSummary.balance.toFixed(2)}</div>
            <p className="text-sm text-zinc-400 mt-2">Previous month balance from income and expense data</p>
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/70 p-3">
              <div className="text-sm text-zinc-400">Available allocation amount for {formatMonthLabel(previousMonthKey)}</div>
              <div className="text-2xl font-bold text-emerald-300 mt-1">RM {availableAllocationAmount.toFixed(2)}</div>
            </div>
            <button
              onClick={() => openCreateModal("allocation")}
              disabled={availableAllocationAmount === 0}
              className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-3 font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add New Distribution
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
            <div className="flex items-center gap-2 text-zinc-400 mb-3">
              <Layers size={18} />
              Month
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl p-4 outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, "0");
                const key = `${year}-${month}`;
                return (
                  <option key={key} value={key}>
                    {key === currentMonth ? `${key} (Current)` : key}
                  </option>
                );
              })}
            </select>
            <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/70 p-3 text-sm text-zinc-400">
              Showing records for {formatMonthLabel(selectedMonth)} and {formatMonthLabel(previousMonthKey)}.
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Distribution Records</h2>
                <p className="text-zinc-400 text-sm">Create manual records or review allocation-backed records here.</p>
              </div>
              <button
                onClick={() => openCreateModal("manual")}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-black font-bold hover:opacity-90"
              >
                <Plus size={16} />
                Add New Distribution
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="text-zinc-400">Loading records…</div>
              ) : visibleRecords.length > 0 ? (
                visibleRecords.map((record) => (
                  <div key={record.id} className="rounded-2xl border border-zinc-800 bg-black/70 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">RM {Number(record.amount).toFixed(2)}</h3>
                          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
                            {record.type}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">{record.note || "No note provided."}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                        <span className="rounded-full bg-zinc-800 px-2.5 py-1">{formatMonthLabel(record.month)}</span>
                        <span className="rounded-full bg-zinc-800 px-2.5 py-1 capitalize">{record.source}</span>
                        <button onClick={() => openEditModal(record)} className="rounded-full bg-zinc-800 p-2 hover:bg-zinc-700">
                          <Pencil size={14} />
                        </button>
                        {record.source === "manual" && (
                          <button onClick={() => handleDelete(record)} className="rounded-full bg-zinc-800 p-2 hover:bg-zinc-700">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-zinc-400">No distributions yet for this period.</div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Previous Month Summary</h2>
                <p className="text-zinc-400 text-sm">This panel stays separate from bookkeeping entries.</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/70 p-4">
              <div className="text-sm text-zinc-400">Previous month balance</div>
              <div className="text-3xl font-bold text-emerald-400 mt-1">RM {previousSummary.balance.toFixed(2)}</div>
              <div className="mt-4 h-px bg-zinc-800" />
              <div className="mt-4 text-sm text-zinc-400">Calculated allocation usage</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">RM {allocationRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0).toFixed(2)}</div>
            </div>
          </div>
        </section>
      </div>

      {detailType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold">{detailType}</h3>
                <p className="text-sm text-zinc-400 mt-1">Showing all historical records for this type.</p>
              </div>
              <button onClick={() => setDetailType(null)} className="rounded-full bg-zinc-800 p-2 hover:bg-zinc-700">
                <X size={16} />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {detailRecords.length > 0 ? (
                detailRecords.map((record) => (
                  <div key={record.id} className="rounded-2xl border border-zinc-800 bg-black/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold">RM {Number(record.amount).toFixed(2)}</div>
                        <div className="text-sm text-zinc-400 mt-1">{record.note || "No note provided."}</div>
                      </div>
                      <div className="text-sm text-zinc-400">{formatMonthLabel(record.month)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-zinc-400">No records for this category yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold">{editingRecord ? "Edit Distribution" : "Add Distribution"}</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {editorMode === "allocation"
                    ? "This record will reduce the available allocation amount for the previous month."
                    : "This record is kept separate from the previous month allocation balance."}
                </p>
              </div>
              <button onClick={() => setEditorOpen(false)} className="rounded-full bg-zinc-800 p-2 hover:bg-zinc-700">
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-zinc-400">Amount</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="RM 0.00"
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as DistributionType }))}
                  className="mt-2 w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none"
                >
                  <option value="Liquid Assets">Liquid Assets</option>
                  <option value="Allocated Assets">Allocated Assets</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-zinc-400">Note</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Add context for this distribution"
                  className="mt-2 min-h-[120px] w-full rounded-2xl border border-zinc-800 bg-black px-4 py-3 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handleSubmit} className="flex-1 rounded-2xl bg-white px-4 py-3 font-bold text-black hover:opacity-90">
                  {editingRecord ? "Save Changes" : "Create Record"}
                </button>
                <button onClick={() => setEditorOpen(false)} className="rounded-2xl border border-zinc-700 px-4 py-3 font-bold text-zinc-300">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
