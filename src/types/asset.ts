export interface Asset {
  id: number;
  name: string;
  current_value: number;
  note: string;
  created_at: string;
  updated_at: string;
}

export type AssetPayload = Omit<Asset, "id" | "created_at" | "updated_at">;

export interface AssetAllocation {
  id: number;
  asset_id: number;
  month: string;
  amount: number;
  created_at: string;
  updated_at: string;
  asset?: Asset;
}

export type AssetAllocationPayload = Omit<AssetAllocation, "id" | "created_at" | "updated_at" | "asset">;

import type { DistributionCategory } from "./distribution";
import type { Currency } from "./currency";

export interface AssetDistribution {
  id: number;
  month: string;
  amount: number;
  currency?: Currency;
  type: "Liquid Assets" | "Allocated Assets";
  note: string;
  source: "allocation" | "manual";
  category_id?: number | null;
  category?: DistributionCategory | null;
  created_at: string;
  updated_at: string;
}

export type AssetDistributionPayload = Omit<AssetDistribution, "id" | "created_at" | "updated_at" | "category">;
