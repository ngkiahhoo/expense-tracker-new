import { supabase } from "../lib/supabase";

export interface MonthlySummary {
  income: number;
  expense: number;
  balance: number;
}

export async function getMonthlySummary(
  selectedMonth: string
): Promise<MonthlySummary> {
  const [year, month] = selectedMonth
    .split("-")
    .map(Number);

  const start = `${selectedMonth}-01`;
  const end = `${selectedMonth}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;

  const [incomeResult, expenseResult] = await Promise.all([
    supabase
      .from("incomes")
      .select("amount")
      .gte("income_date", start)
      .lte("income_date", end),
    supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", start)
      .lte("expense_date", end),
  ]);

  const incomeData = incomeResult.data || [];
  const expenseData = expenseResult.data || [];

  const income = incomeData.reduce(
    (sum, item: any) => sum + Number(item.amount || 0),
    0
  );

  const expense = expenseData.reduce(
    (sum, item: any) => sum + Number(item.amount || 0),
    0
  );

  return {
    income,
    expense,
    balance: income - expense,
  };
}
