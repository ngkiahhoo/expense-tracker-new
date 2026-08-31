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
    <Card
      variant="muted"
      padding="sm"
      className="relative overflow-hidden max-lg:pb-20"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(120px,1fr)_140px_minmax(140px,auto)_104px] lg:items-center">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 lg:block">
          <div className="min-w-0 self-start">
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
            className="min-w-0 self-start text-right text-lg font-bold text-emerald-300 sm:text-2xl lg:hidden"
            title={formattedValue}
          >
            <span className="whitespace-nowrap">
              {formattedValue}
            </span>
          </div>
        </div>

        <Select
          value={asset.is_main ? "main" : ""}
          onChange={(event) => onMainChange(asset, event.target.value === "main")}
          fieldSize="md"
          className="h-12 w-32 shrink-0 rounded-xl lg:w-full"
        >
          <option value="">Blank</option>
          <option value="main">Main</option>
        </Select>

        <div
          className="hidden min-w-0 text-right text-xl font-bold text-emerald-300 sm:text-2xl lg:block"
          title={formattedValue}
        >
          <span className="whitespace-nowrap">
            {formattedValue}
          </span>
        </div>

        <div className="flex justify-end gap-2 max-lg:absolute max-lg:bottom-4 max-lg:right-4">
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
