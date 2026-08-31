import { supabase } from "../lib/supabase";
import type { Income } from "../types/income";
import { normalizeCurrency } from "../utils/currency";
import { logServiceError } from "../utils/logger";
import { getMonthDateRange } from "../utils/monthRange";

export type IncomePayload = Omit<Income, "id">;

function dispatchAssetUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("asset:updated"));
  }
}

export async function getIncomes(selectedMonth: string) {
  const { start, end } = getMonthDateRange(selectedMonth);

  const { data, error } = await supabase
    .from("incomes")
    .select("*")
    .gte("income_date", start)
    .lte("income_date", end);

  if (error) {
    logServiceError("Failed to fetch incomes", error);
    return [];
  }

  return data || [];
}

export async function createIncome(payload: IncomePayload) {
  const { error } = await supabase.from("incomes").insert([payload]);

  if (!error) {
    try {
      const { adjustDefaultAssetValue } = await import("./assetService");
      await adjustDefaultAssetValue(
        Number(payload.amount || 0),
        normalizeCurrency(payload.currency)
      );
      dispatchAssetUpdated();
    } catch (err) {
      logServiceError("Failed to adjust asset after income create", err);
    }
  }

  return error;
}

export async function updateIncome(
  id: number,
  payload: Partial<IncomePayload>
) {
  const { data: existing, error: fetchErr } = await supabase
    .from("incomes")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr) return fetchErr;

  const existingIncome = existing as Income;
  const prevAmount = Number(existingIncome.amount || 0);
  const newAmount = Number(payload.amount ?? prevAmount);
  const prevCurrency = normalizeCurrency(existingIncome.currency);
  const newCurrency = normalizeCurrency(payload.currency ?? prevCurrency);
  const delta = newAmount - prevAmount;

  const { error } = await supabase.from("incomes").update(payload).eq("id", id);

  if (!error) {
    try {
      const { adjustDefaultAssetValue } = await import("./assetService");
      if (prevCurrency === newCurrency) {
        await adjustDefaultAssetValue(delta, newCurrency);
      } else {
        await adjustDefaultAssetValue(-prevAmount, prevCurrency);
        await adjustDefaultAssetValue(newAmount, newCurrency);
      }
      dispatchAssetUpdated();
    } catch (err) {
      logServiceError("Failed to adjust asset after income update", err);
    }
  }

  return error;
}

export async function removeIncome(id: number) {
  const { data: existing, error: fetchErr } = await supabase
    .from("incomes")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr) return fetchErr;

  const existingIncome = existing as Income;
  const prevAmount = Number(existingIncome.amount || 0);
  const prevCurrency = normalizeCurrency(existingIncome.currency);

  const { error } = await supabase.from("incomes").delete().eq("id", id);

  if (!error && prevAmount !== 0) {
    try {
      const { adjustDefaultAssetValue } = await import("./assetService");
      await adjustDefaultAssetValue(-prevAmount, prevCurrency);
      dispatchAssetUpdated();
    } catch (err) {
      logServiceError("Failed to adjust asset after income delete", err);
    }
  }

  return error;
}
