import { Trash2, Pencil } from "lucide-react";
import type { Asset } from "@/types/asset";

interface AssetCardProps {
  asset: Asset;
  onEdit: () => void;
  onDelete: () => void;
}

export default function AssetCard({ asset, onEdit, onDelete }: AssetCardProps) {
  return (
    <div className="bg-black border border-zinc-800 rounded-3xl p-5 grid gap-4 sm:grid-cols-[1fr_auto] items-center">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">{asset.name}</h3>
        </div>
        <p className="text-zinc-400 text-sm mt-1">Updated {new Date(asset.updated_at).toLocaleDateString()}</p>
        <p className="mt-3 text-zinc-200">{asset.note || "No note provided."}</p>
      </div>
      <div className="grid gap-2 justify-end">
        <div className="text-right">
          <p className="text-zinc-400 text-sm">Current Value</p>
          <p className="text-2xl font-bold">RM {Number(asset.current_value).toFixed(2)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="bg-white text-black rounded-2xl p-3 hover:opacity-90">
            <Pencil size={16} />
          </button>
          <button onClick={onDelete} className="bg-red-500 text-black rounded-2xl p-3 hover:opacity-90">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
