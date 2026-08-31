import { supabase } from "../lib/supabase";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import type { Category } from "../types/category";
import type { Asset } from "../types/asset";
import { logServiceError } from "../utils/logger";

export async function fetchAssets() {
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logServiceError("Failed to fetch assets for export", error);
    return [] as Asset[];
  }

  return (data || []) as Asset[];
}

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

