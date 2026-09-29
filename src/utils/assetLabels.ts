import type { Asset } from "@/types/asset";
import type { Currency } from "@/types/currency";

export function mainAssetDefaultLabel(assets: Asset[], currency: Currency) {
  const mainAsset = assets.find((asset) => asset.is_main && (asset.currency || currency) === currency);
  return mainAsset ? `${mainAsset.name} (default)` : "Main Asset (default)";
}
