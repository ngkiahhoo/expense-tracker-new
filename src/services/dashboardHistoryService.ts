import { supabase } from "@/lib/supabase";
import type { Currency } from "@/types/currency";
import type { Expense } from "@/types/expense";
import type { Income } from "@/types/income";

interface DashboardHistory {
  expenses:Expense[];
  incomes:Income[];
}

export async function getDashboardHistory(
  currency:Currency
):Promise<DashboardHistory> {
  const [expensesResponse, incomesResponse] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("currency", currency)
      .order("expense_date", { ascending: true }),
    supabase
      .from("incomes")
      .select("*")
      .eq("currency", currency)
      .order("income_date", { ascending: true }),
  ]);

  if (expensesResponse.error) {
    throw expensesResponse.error;
  }

  if (incomesResponse.error) {
    throw incomesResponse.error;
  }

  return {
    expenses: (expensesResponse.data as Expense[]) || [],
    incomes: (incomesResponse.data as Income[]) || [],
  };
}
