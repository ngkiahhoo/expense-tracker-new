import type { Currency } from "./currency";
import type { DistributionCategory } from "./distribution";

export interface Asset {
  id: number;
  name: string;
  current_value: number;
  currency?: Currency;
  is_main?: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}

export type AssetPayload = Omit<Asset, "id" | "created_at" | "updated_at">;

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
