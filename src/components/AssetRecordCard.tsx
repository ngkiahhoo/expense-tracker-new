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
  const formattedValue = formatCurrencyAmount(
    Number(asset.current_value),
    normalizeCurrency(asset.currency)
  );

  return (
    <Card variant="muted" padding="sm" className="overflow-hidden">
      <div className="grid gap-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">
              {asset.name}
            </div>

            {asset.note && (
              <div className="mt-1 break-words text-sm text-zinc-400">
                {asset.note}
              </div>
            )}
          </div>

          <div
            className="min-w-0 text-right text-lg font-bold text-emerald-300 sm:text-2xl"
            title={formattedValue}
          >
            <span className="whitespace-nowrap">
              {formattedValue}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <Select
            value={asset.is_main ? "main" : ""}
            onChange={(event) => onMainChange(asset, event.target.value === "main")}
            fieldSize="md"
            className="h-12 rounded-xl"
          >
            <option value="">Blank</option>
            <option value="main">Main</option>
          </Select>

          <ActionIconButton
            kind="edit"
            onClick={() => onEdit(asset)}
            title="Edit asset"
            aria-label="Edit asset"
            className="rounded-xl"
          />

          <ActionIconButton
            kind="delete"
            onClick={() => onDelete(asset)}
            title="Delete asset"
            aria-label="Delete asset"
            className="rounded-xl"
          />
        </div>
      </div>
    </Card>
  );
}
