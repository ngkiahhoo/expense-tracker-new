import type { Currency } from "./currency";

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
