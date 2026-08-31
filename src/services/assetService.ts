import { supabase } from "@/lib/supabase";
import type {
  Asset,
  AssetPayload,
} from "@/types/asset";
import type { Currency } from "@/types/currency";
import { DEFAULT_CURRENCY, normalizeCurrency } from "@/utils/currency";

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

export async function updateAssetMainStatus(id: number, isMain: boolean) {
  if (!isMain) {
    return updateAsset(id, { is_main: false });
  }

  const { data: targetAsset, error: targetError } = await supabase
    .from("assets")
    .select("id,currency")
    .eq("id", id)
    .single();

  if (targetError) return targetError;

  const targetCurrency = normalizeCurrency(targetAsset.currency);

  const { data: currentMain, error: fetchError } = await supabase
    .from("assets")
    .select("id")
    .eq("is_main", true)
    .eq("currency", targetCurrency)
    .neq("id", id)
    .maybeSingle();

  if (fetchError) return fetchError;

  if (currentMain) {
    return {
      message: `Please unset the current ${targetCurrency} main asset before choosing another one.`,
    };
  }

  return updateAsset(id, { is_main: true, currency: targetCurrency });
}

export async function adjustMainAssetValue(delta: number, currency: Currency = DEFAULT_CURRENCY) {
  if (delta === 0) return null;

  const targetCurrency = normalizeCurrency(currency);

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("is_main", true)
    .eq("currency", targetCurrency)
    .maybeSingle();

  if (error) return error;
  if (!data) return null;

  return updateAsset(data.id, {
    current_value: Number(data.current_value || 0) + delta,
  });
}

export const adjustDefaultAssetValue = adjustMainAssetValue;

export async function removeAsset(id: number) {
  const { error } = await supabase.from("assets").delete().eq("id", id);
  return error;
}
