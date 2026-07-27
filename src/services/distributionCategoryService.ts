import { supabase } from "@/lib/supabase";
import type { DistributionCategory, DistributionCategoryPayload } from "@/types/distribution";

export async function getDistributionCategories() {
  const { data, error } = await supabase.from("asset_distribution_categories").select("*").order("name");
  if (error) {
    console.log(error);
    return [] as DistributionCategory[];
  }
  return (data || []) as DistributionCategory[];
}

export async function createDistributionCategory(payload: DistributionCategoryPayload) {
  const { error } = await supabase.from("asset_distribution_categories").insert([payload]);
  return error;
}

export async function updateDistributionCategory(id: number, payload: Partial<DistributionCategoryPayload>) {
  const { error } = await supabase.from("asset_distribution_categories").update(payload).eq("id", id);
  return error;
}

export async function removeDistributionCategory(id: number) {
  const { error } = await supabase.from("asset_distribution_categories").delete().eq("id", id);
  return error;
}
