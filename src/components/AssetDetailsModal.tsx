"use client";

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
} from "@/utils/currency";

type AssetsController = ReturnType<typeof useAssets>;

interface AssetDetailsModalProps {
  assets:AssetsController;
  onClose:() => void;
  onToast:(message:string, type:ToastType) => void;
}

export default function AssetDetailsModal({
  assets,
  onClose,
  onToast,
}:AssetDetailsModalProps) {
  return (
    <div className={overlayStyles.backdrop}>
      <div className={cn(overlayStyles.modalPanel, "max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto")}>
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
            onClick={onClose}
            title="Close asset details"
            aria-label="Close asset details"
          />
        </div>

        <div className="mt-5 space-y-4">
          {assets.loading ? (
            <div className="text-zinc-400">
              Loading assets...
            </div>
          ) : assets.assets && assets.assets.length > 0 ? (
            assets.assets.map((asset) => (
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
                onEdit={assets.startEditAsset}
                onDelete={async (nextAsset) => {
                  const res = await assets.deleteAssetById(nextAsset.id);

                  onToast(
                    res.success
                      ? "Asset deleted."
                      : res.error || "Failed to delete",
                    res.success ? "success" : "error"
                  );
                }}
              />
            ))
          ) : (
            <div className="text-zinc-400">
              No assets yet.
            </div>
          )}

          <div className="mt-4 border-t border-zinc-800 pt-4">
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

            <div className="mt-3 flex gap-2">
              <Button
                onClick={async () => {
                  const res = await assets.saveAsset();

                  onToast(
                    res.success
                      ? "Asset saved."
                      : res.error || "Failed to save asset",
                    res.success ? "success" : "error"
                  );
                }}
                variant="primary"
              >
                {assets.assetEditingId ? "Update Asset" : "Create Asset"}
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
  );
}
