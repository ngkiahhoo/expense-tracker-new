import { supabase } from "../lib/supabase";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import type { Category } from "../types/category";
import type { AssetDistribution } from "../types/asset";
import type { DistributionCategory } from "../types/distribution";
import { logServiceError } from "../utils/logger";

export async function fetchExpensesRange(start: string, end: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select(`*, categories ( id, name, type_id, types ( id, name ) )`)
    .gte("expense_date", start)
    .lte("expense_date", end)
    .order("expense_date", { ascending: false });

  if (error) {
    logServiceError("Failed to fetch expenses for export", error);
    return [] as Expense[];
  }

  return (data || []) as Expense[];
}

export async function fetchIncomesRange(start: string, end: string) {
  const { data, error } = await supabase
    .from("incomes")
    .select(`*`)
    .gte("income_date", start)
    .lte("income_date", end)
    .order("income_date", { ascending: false });

  if (error) {
    logServiceError("Failed to fetch incomes for export", error);
    return [] as Income[];
  }

  return (data || []) as Income[];
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select(`id, name, type_id, types ( id, name )`)
    .order("name");

  if (error) {
    logServiceError("Failed to fetch categories for export", error);
    return [] as Category[];
  }

  return (data || []) as unknown as Category[];
}

export async function fetchAssetDistributionsRange(start: string, end: string) {
  const startMonth = start.slice(0, 7);
  const endMonth = end.slice(0, 7);

  const { data, error } = await supabase
    .from("asset_distribution_records")
    .select(`*, asset_distribution_categories ( id, name )`)
    .gte("month", startMonth)
    .lte("month", endMonth)
    .order("month", { ascending: false });

  if (error) {
    logServiceError("Failed to fetch asset distributions for export", error);
    return [] as AssetDistribution[];
  }

  return (data || []) as AssetDistribution[];
}

export async function fetchAssetDistributionCategories() {
  const { data, error } = await supabase
    .from("asset_distribution_categories")
    .select(`id, name`)
    .order("name");

  if (error) {
    logServiceError("Failed to fetch asset distribution categories", error);
    return [] as DistributionCategory[];
  }

  return (data || []) as DistributionCategory[];
}
