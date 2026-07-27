import { supabase } from "@/lib/supabase";
import type { AssetDistribution, AssetDistributionPayload } from "@/types/asset";

export async function getAssetDistributions(month?: string) {
  let query = supabase.from("asset_distribution_records").select("*");

  if (month) {
    query = query.eq("month", month);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.log(error);
    return [] as AssetDistribution[];
  }

  return (data || []) as AssetDistribution[];
}

export async function createAssetDistribution(payload: AssetDistributionPayload) {
  const { data, error } = await supabase
    .from("asset_distribution_records")
    .insert([payload])
    .select()
    .single();

  return { data: data as AssetDistribution | null, error };
}

export async function updateAssetDistribution(id: number, payload: Partial<AssetDistributionPayload>) {
  const { error } = await supabase
    .from("asset_distribution_records")
    .update(payload)
    .eq("id", id);

  return error;
}

export async function removeAssetDistribution(id: number) {
  const { error } = await supabase.from("asset_distribution_records").delete().eq("id", id);
  return error;
}
