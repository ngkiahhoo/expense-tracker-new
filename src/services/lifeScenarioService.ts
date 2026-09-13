import { supabase } from "../lib/supabase";
import { buildBaseline } from "../utils/lifeScenario";
import type { Currency } from "../types/currency";
import type { Asset } from "../types/asset";
import type { Category } from "../types/category";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import type { PaymentPlan } from "../types/paymentPlan";
import type { RecurringExpense } from "../types/recurringExpense";

// Read only: importing a baseline must never post due payments or recurring expenses.
export async function loadScenarioBaseline(currency: Currency, today: string) {
  // Supabase's default response limit must not truncate the historical baseline.
  async function readAll(table: string, select = "*", filtered = false) {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 1000) {
      let query = supabase.from(table).select(select).order("id").range(offset, offset + 999);
      if (filtered) query = query.eq("currency", currency);
      const response = await query;
      if (response.error) return { data: rows, error: response.error };
      rows.push(...response.data);
      if (response.data.length < 1000) return { data: rows, error: null };
    }
  }
  const results = await Promise.all([
    readAll("expenses", "*", true), readAll("incomes", "*", true),
    readAll("assets"), readAll("categories"), readAll("recurring_expenses"),
    readAll("payment_plans", "*, payment_installments(*)"),
  ]);
  const names = ["expenses", "income", "assets", "categories", "recurring expenses", "payment plans"];
  const failures = results.flatMap((r, i) => r.error ? [`${names[i]}: ${r.error.message}`] : []);
  if (failures.length) throw new Error(`Baseline could not be loaded. ${failures.join("; ")}`);
  return buildBaseline({ currency, today, expenses: results[0].data as Expense[], incomes: results[1].data as Income[], assets: results[2].data as Asset[], categories: results[3].data as Category[], recurring: results[4].data as RecurringExpense[], plans: results[5].data as PaymentPlan[] });
}
