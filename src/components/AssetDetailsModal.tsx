"use client";

import OverlayPortal from "@/components/ui/OverlayPortal";
import { useRef, useState } from "react";
import useSessionState from "@/hooks/useSessionState";
import useUnsavedChanges, { confirmPanelClose } from "@/hooks/useUnsavedChanges";
import ListToolbar, { defaultListFilters, type ListFilters } from "./ui/ListToolbar";
import LoadState from "./ui/LoadState";

import type useAssets from "@/hooks/useAssets";
import type { ToastType } from "@/contexts/ToastContext";
import ActionIconButton from "@/components/ui/ActionIconButton";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import {
  cn,
  overlayStyles,
} from "@/components/ui/styles";
import AssetRecordCard from "@/components/AssetRecordCard";
import type { Currency } from "@/types/currency";
import {
  CURRENCIES,
  currencyLabel,
  normalizeCurrency,
  formatCurrencyAmount,
} from "@/utils/currency";

type AssetsController = ReturnType<typeof useAssets>;

interface AssetDetailsModalProps {
  assets:AssetsController;
  onClose:() => void;
  onToast:(message:string, type:ToastType) => void;
  initialCurrency: Currency;
}

export default function AssetDetailsModal({
  assets,
  onClose,
  onToast,
  initialCurrency,
}:AssetDetailsModalProps) {
  const [filters, setFilters] = useSessionState<ListFilters>(`asset-list:${initialCurrency}`, { ...defaultListFilters, currency: initialCurrency, sort: "name" });
  const [updatedId, setUpdatedId] = useState<number | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  useUnsavedChanges(!!(assets.assetName || assets.assetValue || assets.assetNote), assets.loading);
  const visible = assets.assets.filter(a => (filters.currency === "all" || normalizeCurrency(a.currency) === filters.currency) && `${a.name} ${a.note}`.toLowerCase().includes(filters.query.trim().toLowerCase())).sort((a, b) => (filters.sort === "amount" ? Number(a.current_value) - Number(b.current_value) : a.name.localeCompare(b.name)) * (filters.direction === "asc" ? 1 : -1));
  return (
    <OverlayPortal>
    <div className={overlayStyles.backdrop} role="dialog" aria-modal="true" aria-label="Asset Details">
      <div className={cn(overlayStyles.modalPanel, "max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold">
              Asset Details
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              All tracked asset records. Edit values or create new assets here.
            </p>
          </div>

          <ActionIconButton
            kind="close"
            onClick={() => { if (confirmPanelClose()) onClose(); }}
            title="Close asset details"
            aria-label="Close asset details"
          />
        </div>

        <div className="mt-5 space-y-4">
          <ListToolbar value={filters} onChange={setFilters} currencies={["MYR", "SGD"]} sorts={[{ value: "name", label: "Name" }, { value: "amount", label: "Amount" }]} />
          <LoadState error={assets.error} retry={assets.fetchAssets} />
          {assets.error ? null : assets.loading ? (
            <div className="text-zinc-400">
              Loading assets...
            </div>
          ) : visible.length > 0 ? (
            visible.map((asset) => (
              <div key={asset.id} className={updatedId === asset.id ? "rounded-lg ring-2 ring-teal-400" : ""}>
              <AssetRecordCard
                key={asset.id}
                asset={asset}
                onMainChange={async (nextAsset, isMain) => {
                  const res = await assets.setMainAsset(nextAsset.id, isMain);

                  onToast(
                    res.success
                      ? isMain ? "Main asset selected." : "Main asset cleared."
                      : res.error || "Failed to update main asset.",
                    res.success ? "success" : "error"
                  );
                }}
                onEdit={asset => { if ((assets.assetName || assets.assetValue) && !confirmPanelClose()) return; assets.startEditAsset(asset); editor.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }}
                onDelete={async (nextAsset) => {
                  if (!window.confirm(`Delete ${nextAsset.name} (${formatCurrencyAmount(Number(nextAsset.current_value), nextAsset.currency)})? This removes the asset from your total.${nextAsset.is_main ? " It is your main account for this currency." : ""}`)) return;
                  const res = await assets.deleteAssetById(nextAsset.id);

                  onToast(
                    res.success
                      ? "Asset deleted."
                      : res.error || "Failed to delete",
                    res.success ? "success" : "error"
                  );
                }}
              />
              </div>
            ))
          ) : (
            <div className="text-zinc-400">
              No matching assets.
            </div>
          )}

          <div ref={editor} className="mt-4 scroll-mt-4 border-t border-zinc-800 pt-4">
            <h3 className="font-bold">
              Create / Edit Asset
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Input
                value={assets.assetName}
                onChange={(event) => assets.setAssetName(event.target.value)}
                placeholder="Asset name"
              />

              <Input
                type="number"
                value={assets.assetValue}
                onChange={(event) => assets.setAssetValue(event.target.value)}
                placeholder="Current value"
              />

              <Select
                value={assets.assetCurrency}
                onChange={(event) => assets.setAssetCurrency(event.target.value as Currency)}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currencyLabel(currency)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-3">
              <Textarea
                value={assets.assetNote}
                onChange={(event) => assets.setAssetNote(event.target.value)}
                placeholder="Note (optional)"
              />
            </div>

            <div className="sticky bottom-0 mt-3 flex flex-wrap gap-2 bg-zinc-950 py-3">
              <Button
                disabled={assets.loading}
                onClick={async () => {
                  const editedId = assets.assetEditingId;
                  const res = await assets.saveAsset();
                  if (res.success) setUpdatedId(editedId);

                  onToast(
                    res.success
                      ? "Asset saved."
                      : res.error || "Failed to save asset",
                    res.success ? "success" : "error"
                  );
                }}
                variant="primary"
              >
                {assets.loading ? "Saving..." : assets.assetEditingId ? "Update Asset" : "Create Asset"}
              </Button>

              {assets.assetEditingId && (
                <Button
                  onClick={assets.resetAssetForm}
                  variant="outline"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </OverlayPortal>
  );
}
