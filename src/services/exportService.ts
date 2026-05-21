import { supabase } from "../lib/supabase";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import type { Category } from "../types/category";

export async function fetchExpensesRange(start: string, end: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select(`*, categories ( id, name, type_id, types ( id, name ) )`)
    .gte("expense_date", start)
    .lte("expense_date", end)
    .order("expense_date", { ascending: false });

  if (error) {
    console.log(error);
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
    console.log(error);
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
    console.log(error);
    return [] as Category[];
  }

  return (data || []) as unknown as Category[];
}
