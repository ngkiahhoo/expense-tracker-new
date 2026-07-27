import { supabase } from "@/lib/supabase";
import type {
  Asset,
  AssetPayload,
  AssetAllocation,
  AssetAllocationPayload,
} from "@/types/asset";

export async function getAssets() {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.log(error);
    return [] as Asset[];
  }

  return (data || []) as Asset[];
}

export async function createAsset(payload: AssetPayload) {
  const { error } = await supabase.from("assets").insert([payload]);
  return error;
}

export async function updateAsset(id: number, payload: Partial<Asset>) {
  const { error } = await supabase
    .from("assets")
    .update(payload)
    .eq("id", id);
  return error;
}

export async function removeAsset(id: number) {
  const { error } = await supabase.from("assets").delete().eq("id", id);
  return error;
}

export async function getMonthlyAllocationTotal(month: string) {
  const { data, error } = await supabase
    .from("asset_allocations")
    .select("amount")
    .eq("month", month);

  if (error) {
    console.log(error);
    return 0;
  }

  const allocations = (data || []) as AssetAllocation[];
  return allocations.reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
}

export async function createAssetAllocation(
  payload: AssetAllocationPayload
) {
  const { data, error } = await supabase
    .from("asset_allocations")
    .insert([payload])
    .select()
    .single();

  return { data: data as AssetAllocation | null, error };
}

export async function removeAssetAllocation(id: number) {
  const { error } = await supabase.from("asset_allocations").delete().eq("id", id);
  return error;
}
