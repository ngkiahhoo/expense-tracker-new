"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Layers,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import ActionIconButton from "@/components/ui/ActionIconButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import AssetRecordCard from "@/components/AssetRecordCard";
import {
  buttonStyles,
  cardStyles,
  cn,
  overlayStyles,
} from "@/components/ui/styles";
import { useToast } from "@/contexts/ToastContext";
import useMonthlySummary from "@/hooks/useMonthlySummary";
import useAssets from "@/hooks/useAssets";
import {
  createAssetDistribution,
  getAssetDistributions,
  removeAssetDistribution,
  updateAssetDistribution,
} from "@/services/assetDistributionService";
import type { AssetDistribution, AssetDistributionPayload } from "@/types/asset";
import type { Currency } from "@/types/currency";
import type { DistributionCategory } from "@/types/distribution";
import {
  CURRENCIES,
  currencyLabel,
  formatCurrencyAmount,
  getStoredCurrency,
  normalizeCurrency,
} from "@/utils/currency";
import {
  getDistributionCategories,
  createDistributionCategory,
  updateDistributionCategory,
  removeDistributionCategory,
} from "@/services/distributionCategoryService";

type DistributionType = AssetDistribution["type"];
type DistributionSource = AssetDistribution["source"];

interface DistributionDetail {
  type: DistributionType;
  currency: Currency;
}

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

function totalRecordsByCurrency(records: AssetDistribution[]) {
  return CURRENCIES.reduce(
    (result, currency) => {
      const matchingRecords = records.filter(
        (record) => normalizeCurrency(record.currency) === currency
      );

      result[currency] = {
        total: matchingRecords.reduce(
          (sum, record) => sum + Number(record.amount || 0),
          0
        ),
        count: matchingRecords.length,
      };

      return result;
    },
    {
      MYR: { total: 0, count: 0 },
      SGD: { total: 0, count: 0 },
    } as Record<Currency, { total: number; count: number }>
  );
}

export default function AssetsPage() {
  const toast = useToast();
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [activeCurrency, setActiveCurrency] = useState<Currency>(() => getStoredCurrency());
  const previousMonthKey = useMemo(() => getPreviousMonthKey(selectedMonth), [selectedMonth]);

  const { summary: previousSummary } = useMonthlySummary(previousMonthKey, activeCurrency);

  const assets = useAssets(selectedMonth);
  const activeCurrencyAssets = useMemo(
    () => (assets.assets || []).filter((asset) => normalizeCurrency(asset.currency) === activeCurrency),
    [assets.assets, activeCurrency]
  );
  const activeCurrencyAssetTotal = useMemo(
    () => activeCurrencyAssets.reduce((sum, asset) => sum + Number(asset.current_value || 0), 0),
    [activeCurrencyAssets]
  );
  const [records, setRecords] = useState<AssetDistribution[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailType, setDetailType] = useState<DistributionDetail | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<DistributionSource>("manual");
  const [editingRecord, setEditingRecord] = useState<AssetDistribution | null>(null);
  const [form, setForm] = useState({
    amount: "",
    type: "Liquid Assets" as DistributionType,
    note: "",
    category_id: "",
  });

  const [distributionCategories, setDistributionCategories] = useState<DistributionCategory[]>([]);
  const [newDistCategoryName, setNewDistCategoryName] = useState("");
  const [editingDistCategoryId, setEditingDistCategoryId] = useState<number | null>(null);

  useEffect(() => {
    void loadRecords();
  }, [selectedMonth]);

  useEffect(() => {
    const handler = (e: Event) => {
      try {
        // refresh records when transactions change
        void loadRecords();
      } catch {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("transactions:changed", handler as EventListener);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("transactions:changed", handler as EventListener);
      }
    };
  }, []);

  useEffect(() => {
    void loadDistributionCategories();
  }, []);

  function handleCurrencyChange(value: string) {
    const nextCurrency: Currency =
      value === "SGD"
        ? "SGD"
        : "MYR";

    setActiveCurrency(nextCurrency);
    window.localStorage.setItem("expense-tracker-currency", nextCurrency);
  }

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
    () =>
      records.filter(
        (record) =>
          record.source === "allocation" &&
          record.month === previousMonthKey &&
          normalizeCurrency(record.currency) === activeCurrency
      ),
    [records, previousMonthKey, activeCurrency]
  );

  const detailRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          detailType !== null &&
          record.type === detailType.type &&
          normalizeCurrency(record.currency) === detailType.currency
      ),
    [detailType, records]
  );

  const liquidTotalsByCurrency = useMemo(
    () => totalRecordsByCurrency(allLiquidRecords),
    [allLiquidRecords]
  );

  const allocatedTotalsByCurrency = useMemo(
    () => totalRecordsByCurrency(allAllocatedRecords),
    [allAllocatedRecords]
  );

  const detailTotals = useMemo(() => {
    const map = new Map<string, number>();
    detailRecords.forEach((r) => {
      const name = distributionCategories.find((c) => c.id === r.category_id)?.name || "Uncategorized";
      map.set(name, (map.get(name) || 0) + Number(r.amount || 0));
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total }));
  }, [detailRecords, distributionCategories]);

  const availableAllocationAmount =
    previousSummary.balance - allocationRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);

  const hasLiquidAssets = useMemo(
    () => CURRENCIES.some((currency) => liquidTotalsByCurrency[currency].total > 0),
    [liquidTotalsByCurrency]
  );

  const hasAllocatedAssets = useMemo(
    () => CURRENCIES.some((currency) => allocatedTotalsByCurrency[currency].total > 0),
    [allocatedTotalsByCurrency]
  );

  function openCreateModal(source: DistributionSource) {
    setEditorMode(source);
    setEditingRecord(null);
    setForm({ amount: "", type: "Liquid Assets", note: "", category_id: "" });
    setEditorOpen(true);
  }

  function openEditModal(record: AssetDistribution) {
    setEditorMode(record.source);
    setEditingRecord(record);
    setForm({
      amount: String(record.amount),
      type: record.type,
      note: record.note || "",
      category_id: record.category_id ? String(record.category_id) : "",
    });
    setEditorOpen(true);
  }

  async function handleSubmit() {
    const parsedAmount = Number(form.amount);

    if (Number.isNaN(parsedAmount) || (parsedAmount === 0 && !editingRecord)) {
      toast.showToast("Please enter a non-zero amount.", "error");
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
      if (!editingRecord && parsedAmount === 0 && availableAllocationAmount === 0) {
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
            category_id: form.category_id ? Number(form.category_id) : null,
            currency: normalizeCurrency(editingRecord.currency),
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
          category_id: form.category_id ? Number(form.category_id) : null,
          source: editorMode,
          currency: activeCurrency,
        };
        await createAssetDistribution(payload);
        toast.showToast("Distribution added.", "success");
      }

      setEditorOpen(false);
      setEditingRecord(null);
      await loadRecords();
    } catch (error: unknown) {
      console.error("Distribution save failed", error);
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the distribution.";
      toast.showToast(message, "error");
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

  async function loadDistributionCategories() {
    try {
      const data = await getDistributionCategories();
      setDistributionCategories((data || []) as DistributionCategory[]);
    } catch (err) {
      console.log(err);
    }
  }

  async function addDistributionCategoryInline() {
    if (!newDistCategoryName.trim()) {
      toast.showToast("Enter a category name.", "error");
      return;
    }

    try {
      if (editingDistCategoryId) {
        await updateDistributionCategory(editingDistCategoryId, { name: newDistCategoryName });
        toast.showToast("Category updated.", "success");
        setEditingDistCategoryId(null);
      } else {
        await createDistributionCategory({ name: newDistCategoryName });
        toast.showToast("Category added.", "success");
      }
      setNewDistCategoryName("");
      await loadDistributionCategories();
    } catch (err) {
      console.log(err);
      toast.showToast("Failed to save category.", "error");
    }
  }

  async function startEditDistributionCategory(cat: DistributionCategory) {
    setEditingDistCategoryId(cat.id);
    setNewDistCategoryName(cat.name || "");
  }

  async function deleteDistributionCategoryInline(id: number) {
    try {
      await removeDistributionCategory(id);
      toast.showToast("Category deleted.", "success");
      await loadDistributionCategories();
    } catch (err) {
      console.log(err);
      toast.showToast("Failed to delete category.", "error");
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 pt-4 pb-28 text-white sm:px-6 sm:pt-6 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-5">
        <Card
          variant="panel"
          padding="lg"
          className="flex h-full min-h-[132px] flex-col justify-center md:min-h-[150px]"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Layers size={18} />
                <span>Asset Management</span>
              </div>
            </div>
            <Link
              href="/"
              className={cn(
                buttonStyles.base,
                buttonStyles.variants.primary,
                buttonStyles.sizes.md,
                "w-full justify-center sm:w-auto"
              )}
            >
              <ArrowUpRight size={18} />
              Back to Cash Flow
            </Link>
          </div>
        </Card>

        <section className="grid gap-4 grid-cols-1">
          <Card className="text-left cursor-pointer" variant="info" onClick={async () => { setShowAssetModal(true); await loadRecords(); }}>
            <div>
              <div className="flex items-center gap-2 text-zinc-400 mb-3">
                <Wallet size={18} />
                Total Assets
              </div>
              <div className="space-y-2">
                <div className="block w-full rounded-xl border border-cyan-500/20 bg-black/30 px-3 py-3 text-left transition hover:border-cyan-300">
                  <div className="text-2xl font-bold text-cyan-400">
                    {formatCurrencyAmount(
                      activeCurrencyAssetTotal,
                      activeCurrency
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-zinc-400 mt-2">{activeCurrencyAssets.length} record{activeCurrencyAssets.length === 1 ? "" : "s"}</p>
            </div>
          </Card>

          <Card variant="success" className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 text-zinc-400 mb-3">
                <CalendarDays size={18} />
                Balance & Allocation
              </div>
              <div className="text-3xl font-bold text-emerald-400">{formatCurrencyAmount(previousSummary.balance, activeCurrency)}</div>
              <p className="text-sm text-zinc-400 mt-2">Previous month balance from income and expense data</p>
              <div className={cn(cardStyles.variants.inset, "mt-4 p-3")}>
                <div className="text-sm text-zinc-400">Available allocation amount for {formatMonthLabel(previousMonthKey)}</div>
                <div className="text-2xl font-bold text-emerald-300 mt-1">{formatCurrencyAmount(availableAllocationAmount, activeCurrency)}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/70 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <Layers size={18} />
                <span>Month</span>
              </div>

              <div className="mt-3 space-y-3">
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
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
                </Select>

                <Select
                  value={activeCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currencyLabel(currency)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className={cn(cardStyles.variants.inset, "mt-4 p-3 text-sm text-zinc-400")}>
                Showing records for {formatMonthLabel(selectedMonth)} and {formatMonthLabel(previousMonthKey)}.
              </div>
            </div>

            <Button
              onClick={() => openCreateModal("allocation")}
              disabled={availableAllocationAmount === 0}
              className="w-full"
              variant="secondary"
            >
              Add New Distribution
            </Button>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-1">
          <Card variant="default">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">Distribution Records</h2>
                <p className="text-zinc-400 text-sm">Create manual records or review allocation-backed records here.</p>
              </div>
              <Button onClick={() => openCreateModal("manual")} variant="primary" className="gap-2">
                <Plus size={16} />
                Add New Distribution
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="text-zinc-400">Loading records...</div>
              ) : visibleRecords.length > 0 ? (
                visibleRecords.map((record) => (
                  <Card key={record.id} variant="muted" padding="sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">{formatCurrencyAmount(Number(record.amount), record.currency)}</h3>
                          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
                            {record.type}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">{record.note || "No note provided."}</p>
                        <p className="text-sm text-zinc-400 mt-1">{distributionCategories.find((c) => c.id === record.category_id)?.name || "Uncategorized"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                        <span className="rounded-full bg-zinc-800 px-2.5 py-1">{formatMonthLabel(record.month)}</span>
                        <span className="rounded-full bg-zinc-800 px-2.5 py-1 capitalize">{record.source}</span>
                        <ActionIconButton
                          kind="edit"
                          onClick={() => openEditModal(record)}
                          title="Edit distribution"
                          aria-label="Edit distribution"
                        />
                        {record.source === "manual" && (
                          <ActionIconButton
                            kind="delete"
                            onClick={() => handleDelete(record)}
                            title="Delete distribution"
                            aria-label="Delete distribution"
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-zinc-400">No distributions yet for this period.</div>
              )}
            </div>
          </Card>

        </section>
      </div>

      {detailType && (
        <div className={overlayStyles.backdrop}>
          <div className={cn(overlayStyles.modalPanel, "max-w-xl")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold">{detailType.type}</h3>
                <p className="text-sm text-zinc-400 mt-1">Showing all historical records for this type.</p>
              </div>
              <ActionIconButton
                kind="close"
                onClick={() => setDetailType(null)}
                title="Close details"
                aria-label="Close details"
              />
            </div>
            <div className="mt-5 space-y-3">
              {detailTotals.length > 0 ? (
                detailTotals.map((entry) => (
                  <Card key={entry.name} variant="muted" className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold">{formatCurrencyAmount(Number(entry.total), detailType.currency)}</div>
                        <div className="text-sm text-zinc-400 mt-1">{entry.name}</div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-zinc-400">No totals for this category yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showAssetModal && (
        <div className={overlayStyles.backdrop}>
          <div className={cn(overlayStyles.modalPanel, "max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold">Asset Details</h3>
                <p className="text-sm text-zinc-400 mt-1">All tracked asset records. Edit values or create new assets here.</p>
              </div>
              <ActionIconButton
                kind="close"
                onClick={() => setShowAssetModal(false)}
                title="Close asset details"
                aria-label="Close asset details"
              />
            </div>

            <div className="mt-5 space-y-4">

              {assets.loading ? (
                <div className="text-zinc-400">Loading assets...</div>
              ) : assets.assets && assets.assets.length > 0 ? (
                assets.assets.map((a) => (
                  <AssetRecordCard
                    key={a.id}
                    asset={a}
                    onMainChange={async (asset, isMain) => {
                      const res = await assets.setMainAsset(asset.id, isMain);
                      if (res.success) {
                        toast.showToast(
                          isMain ? "Main asset selected." : "Main asset cleared.",
                          "success"
                        );
                      } else {
                        toast.showToast(res.error || "Failed to update main asset.", "error");
                      }
                    }}
                    onEdit={assets.startEditAsset}
                    onDelete={async (asset) => {
                      const res = await assets.deleteAssetById(asset.id);
                      if (res.success) {
                        toast.showToast("Asset deleted.", "success");
                        await assets.fetchAllocatedAmount();
                      } else {
                        toast.showToast(res.error || "Failed to delete", "error");
                      }
                    }}
                  />
                ))
              ) : (
                <div className="text-zinc-400">No assets yet.</div>
              )}

              <div className="mt-4 border-t border-zinc-800 pt-4">
                <h3 className="font-bold">Create / Edit Asset</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Input value={assets.assetName} onChange={(e) => assets.setAssetName(e.target.value)} placeholder="Asset name" />
                  <Input type="number" value={assets.assetValue} onChange={(e) => assets.setAssetValue(e.target.value)} placeholder="Current value" />
                  <Select value={assets.assetCurrency} onChange={(e) => assets.setAssetCurrency(e.target.value as Currency)}>
                    {CURRENCIES.map((c) => (<option key={c} value={c}>{currencyLabel(c)}</option>))}
                  </Select>
                </div>
                <div className="mt-3">
                  <Textarea value={assets.assetNote} onChange={(e) => assets.setAssetNote(e.target.value)} placeholder="Note (optional)" />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button onClick={async () => { const res = await assets.saveAsset(); if (res.success) { toast.showToast('Asset saved.', 'success'); await assets.fetchAllocatedAmount(); } else { toast.showToast(res.error || 'Failed to save asset', 'error'); } }} variant="primary">{assets.assetEditingId ? 'Update Asset' : 'Create Asset'}</Button>
                  {assets.assetEditingId && <Button onClick={() => assets.resetAssetForm()} variant="outline">Cancel</Button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editorOpen && (
        <div className={overlayStyles.backdrop}>
          <div className={cn(overlayStyles.modalPanel, "max-w-lg")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-bold">{editingRecord ? "Edit Distribution" : "Add Distribution"}</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {editorMode === "allocation"
                    ? "This record will reduce the available allocation amount for the previous month."
                    : "This record is kept separate from the previous month allocation balance."}
                </p>
              </div>
              <ActionIconButton
                kind="close"
                onClick={() => setEditorOpen(false)}
                title="Close editor"
                aria-label="Close editor"
              />
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-zinc-400">Amount</label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder={`${currencyLabel(editingRecord?.currency || activeCurrency)} 0.00`}
                  fieldSize="md"
                  className="mt-2"
                />
              </div>

            <div>
              <label className="text-sm text-zinc-400">Type</label>
              <Select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as DistributionType }))}
                  fieldSize="md"
                  className="mt-2"
                >
                  <option value="Liquid Assets">Liquid Assets</option>
                  <option value="Allocated Assets">Allocated Assets</option>
                </Select>
              </div>

              <div>
                <label className="text-sm text-zinc-400">Note</label>
                <Textarea
                  value={form.note}
                  onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Add context for this distribution"
                  fieldSize="md"
                  className="mt-2 min-h-[120px]"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400">Category</label>
                <Select
                  value={form.category_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
                  fieldSize="md"
                  className="mt-2"
                >
                  <option value="">Select Category</option>
                  {distributionCategories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
                <div className="mt-3 grid gap-2">
                  <Input
                    value={newDistCategoryName}
                    onChange={(e) => setNewDistCategoryName(e.target.value)}
                    placeholder="New category name"
                  />

                  <div className="mt-3 flex items-center gap-2">
                    <Button onClick={addDistributionCategoryInline} variant="primary" className="flex-1">
                      {editingDistCategoryId ? "Update Category" : "Add Category"}
                    </Button>
                    {editingDistCategoryId && (
                      <Button
                        onClick={() => {
                          setEditingDistCategoryId(null);
                          setNewDistCategoryName("");
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                  {form.category_id && (
                    <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-zinc-800 bg-black p-3">
                      <div className="min-w-0">
                        <div className="font-bold truncate">
                          {distributionCategories.find((cat) => cat.id === Number(form.category_id))?.name || "Selected category"}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <ActionIconButton
                          kind="edit"
                          type="button"
                          onClick={() => {
                            const selected = distributionCategories.find((cat) => cat.id === Number(form.category_id));
                            if (selected) startEditDistributionCategory(selected);
                          }}
                          title="Edit distribution category"
                          aria-label="Edit distribution category"
                        />
                        <ActionIconButton
                          kind="delete"
                          type="button"
                          onClick={() => deleteDistributionCategoryInline(Number(form.category_id))}
                          title="Delete distribution category"
                          aria-label="Delete distribution category"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleSubmit} variant="primary" className="flex-1">
                  {editingRecord ? "Save Changes" : "Create Record"}
                </Button>
                <Button onClick={() => setEditorOpen(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
