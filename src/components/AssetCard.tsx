import ActionIconButton from "@/components/ui/ActionIconButton";
import { Card } from "@/components/ui/Card";

import type { Asset } from "@/types/asset";

interface AssetCardProps {
  asset: Asset;
  onEdit: () => void;
  onDelete: () => void;
}

export default function AssetCard({
  asset,
  onEdit,
  onDelete,
}: AssetCardProps) {
  return (
    <Card
      variant="inset"
      padding="md"
      className="grid items-center gap-4 sm:grid-cols-[1fr_auto]"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">{asset.name}</h3>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Updated {new Date(asset.updated_at).toLocaleDateString()}
        </p>
        <p className="mt-3 text-zinc-200">
          {asset.note || "No note provided."}
        </p>
      </div>

      <div className="grid justify-end gap-2">
        <div className="text-right">
          <p className="text-sm text-zinc-400">Current Value</p>
          <p className="text-2xl font-bold">
            RM {Number(asset.current_value).toFixed(2)}
          </p>
        </div>

        <div className="flex gap-2">
          <ActionIconButton
            kind="edit"
            onClick={onEdit}
            title="Edit asset"
            aria-label="Edit asset"
          />
          <ActionIconButton
            kind="delete"
            onClick={onDelete}
            title="Delete asset"
            aria-label="Delete asset"
          />
        </div>
      </div>
    </Card>
  );
}
