import { supabase } from "../lib/supabase";
import type { Currency } from "../types/currency";
import type { Expense } from "../types/expense";
import { normalizeCurrency } from "../utils/currency";

export type ExpensePayload = {
  amount: number;
  note: string;
  expense_date: string;
  category_id: number;
  currency?: Currency;
  recurring_expense_id?: number;
};

export async function getExpenses(
  selectedMonth:string
) {

  const [year, month] = selectedMonth.split("-").map(Number);
  const start = `${selectedMonth}-01`;
  const end = `${selectedMonth}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;

  const { data, error } =
    await supabase
      .from("expenses")
      .select(`
        *,
        categories (
          id,
          name,
          type_id,
          types (
            id,
            name
          )
        )
      `)
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", {
        ascending:false,
      });

  if (error) {
    console.log(error);
    return [];
  }

  return data || [];
}

export async function createExpense(
  payload:ExpensePayload
) {

  const { error } =
    await supabase
      .from("expenses")
      .insert([payload]);

  if (!error) {
    try {
      const { adjustMainAssetValue } = await import("./assetService");
      await adjustMainAssetValue(-Number(payload.amount || 0), normalizeCurrency(payload.currency));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("asset:updated"));
      }
    } catch (e) {
      console.log("Failed to adjust asset after expense create:", e);
    }
  }

  return error;
}

export async function updateExpense(
  id:number,
  payload:Partial<ExpensePayload>
) {
  const { data: existing, error: fetchErr } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr) return fetchErr;

  const existingExpense = existing as Expense;
  const prevAmount = Number(existingExpense.amount || 0);
  const newAmount = Number(payload.amount ?? prevAmount);
  const prevCurrency = normalizeCurrency(existingExpense.currency);
  const newCurrency = normalizeCurrency(payload.currency ?? prevCurrency);
  const delta = prevAmount - newAmount;

  const { error } =
    await supabase
      .from("expenses")
      .update(payload)
      .eq("id", id);

  if (!error) {
    try {
      const { adjustMainAssetValue } = await import("./assetService");
      if (prevCurrency === newCurrency) {
        await adjustMainAssetValue(delta, newCurrency);
      } else {
        await adjustMainAssetValue(prevAmount, prevCurrency);
        await adjustMainAssetValue(-newAmount, newCurrency);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("asset:updated"));
      }
    } catch (e) {
      console.log("Failed to adjust asset after expense update:", e);
    }
  }

  return error;
}

export async function removeExpense(
  id:number
) {
  const { data: existing, error: fetchErr } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr) return fetchErr;

  const existingExpense = existing as Expense;
  const prevAmount = Number(existingExpense.amount || 0);
  const prevCurrency = normalizeCurrency(existingExpense.currency);

  const { error } =
    await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

  if (!error && prevAmount !== 0) {
    try {
      const { adjustMainAssetValue } = await import("./assetService");
      await adjustMainAssetValue(prevAmount, prevCurrency);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("asset:updated"));
      }
    } catch (e) {
      console.log("Failed to adjust asset after expense delete:", e);
    }
  }

  return error;
}

export async function removeExpensesByMonth(
  selectedMonth:string
) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const start = `${selectedMonth}-01`;
  const end = `${selectedMonth}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;

  const { data: existing, error: fetchErr } = await supabase
    .from("expenses")
    .select("amount,currency")
    .gte("expense_date", start)
    .lte("expense_date", end);

  if (fetchErr) return fetchErr;

  const removedTotals = (existing || []).reduce((totals, expense) => {
    const currency = normalizeCurrency(expense.currency);
    totals[currency] += Number(expense.amount || 0);
    return totals;
  }, { MYR: 0, SGD: 0 } as Record<Currency, number>);

  const { error } =
    await supabase
      .from("expenses")
      .delete()
      .gte("expense_date", start)
      .lte("expense_date", end);

  if (!error) {
    try {
      const { adjustMainAssetValue } = await import("./assetService");
      await Promise.all(
        Object.entries(removedTotals).map(([currency, total]) =>
          adjustMainAssetValue(total, currency as Currency)
        )
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("asset:updated"));
      }
    } catch (e) {
      console.log("Failed to adjust asset after monthly expense delete:", e);
    }
  }

  return error;
}

export async function getExpensesByCategory(
  selectedMonth: string,
  categoryId: number | null,
  search: string | null = null,
  limit = 10,
  offset = 0,
  sortField = 'expense_date',
  sortDirection: 'asc' | 'desc' = 'desc',
  currency?: Currency
) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const start = `${selectedMonth}-01`;
  const end = `${selectedMonth}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;

  let query = supabase
    .from('expenses')
    .select(
      `*, categories ( id, name, type_id, types ( id, name ) )`,
      { count: 'exact' }
    )
    .gte('expense_date', start)
    .lte('expense_date', end)
    .range(offset, offset + limit - 1)
    .order(sortField, { ascending: sortDirection === 'asc' });

  if (categoryId !== null) {
    query = query.eq('category_id', categoryId);
  }

  if (search) {
    // simple server-side search on note field
    query = query.ilike('note', `%${search}%`);
  }

  if (currency) {
    query = query.eq('currency', currency);
  }

  const { data, count, error } = await query;

  if (error) {
    console.log(error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}
