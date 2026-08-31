"use client";

import ActionIconButton from "@/components/ui/ActionIconButton";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import type { Asset } from "@/types/asset";
import { formatCurrencyAmount, normalizeCurrency } from "@/utils/currency";

interface AssetRecordCardProps {
  asset: Asset;
  onMainChange: (asset: Asset, isMain: boolean) => void | Promise<void>;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void | Promise<void>;
}

export default function AssetRecordCard({
  asset,
  onMainChange,
  onEdit,
  onDelete,
}: AssetRecordCardProps) {
  return (
    <Card variant="muted" padding="sm" className="overflow-hidden">
      <div className="grid gap-4 lg:grid-cols-[minmax(120px,1fr)_140px_minmax(140px,auto)_104px] lg:items-center">
        <div className="min-w-0 self-center">
          <div className="truncate text-lg font-bold">
            {asset.name}
          </div>

          {asset.note && (
            <div className="mt-1 break-words text-sm text-zinc-400">
              {asset.note}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 lg:contents">
          <Select
            value={asset.is_main ? "main" : ""}
            onChange={(event) => onMainChange(asset, event.target.value === "main")}
            fieldSize="md"
            className="h-12 w-32 shrink-0 rounded-xl lg:w-full"
          >
            <option value="">Blank</option>
            <option value="main">Main</option>
          </Select>

          <div className="min-w-0 text-right text-xl font-bold text-emerald-300 sm:text-2xl">
            <span className="whitespace-nowrap">
              {formatCurrencyAmount(
                Number(asset.current_value),
                normalizeCurrency(asset.currency)
              )}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <ActionIconButton
            kind="edit"
            onClick={() => onEdit(asset)}
            title="Edit asset"
            aria-label="Edit asset"
          />

          <ActionIconButton
            kind="delete"
            onClick={() => onDelete(asset)}
            title="Delete asset"
            aria-label="Delete asset"
          />
        </div>
      </div>
    </Card>
  );
}
