export interface DistributionCategory {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export type DistributionCategoryPayload = Omit<DistributionCategory, "id" | "created_at" | "updated_at">;
