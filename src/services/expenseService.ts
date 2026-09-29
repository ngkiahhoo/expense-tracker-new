import { supabase } from "../lib/supabase";
import type { Currency } from "../types/currency";
import type { Expense } from "../types/expense";
import { normalizeCurrency } from "../utils/currency";
import { logServiceError } from "../utils/logger";
import { getMonthDateRange } from "../utils/monthRange";

export type ExpensePayload = {
  amount: number;
  note: string;
  expense_date: string;
  category_id: number;
  asset_id?: number | null;
  currency?: Currency;
  recurring_expense_id?: number;
};

async function adjustExpenseAsset(amount: number, currency: Currency, assetId?: number | null) {
  const { adjustAssetValue } = await import("./assetService");
  if (assetId) return adjustAssetValue(assetId, amount, currency);

  const { data, error } = await supabase
    .from("assets")
    .select("id")
    .eq("is_main", true)
    .eq("currency", currency)
    .maybeSingle();

  if (error) return error;
  if (!data) return new Error(`Set a ${currency} Main Asset before recording expenses in ${currency}.`);

  return adjustAssetValue(data.id, amount, currency);
}

async function insertExpensePayload(payload: ExpensePayload) {
  const { data, error } = await supabase
    .from("expenses")
    .insert([payload])
    .select("id")
    .single();

  if (!error || !payload.asset_id) return { data, error };
  if (error.code !== "PGRST204") return { data, error };

  const fallbackPayload = { ...payload };
  delete fallbackPayload.asset_id;
  return supabase
    .from("expenses")
    .insert([fallbackPayload])
    .select("id")
    .single();
}

export async function getAllExpenseRecords(): Promise<Expense[]> {
  const records: Expense[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from("expenses")
      .select("*, categories(id, name, type_id, types(id, name))")
      .order("expense_date", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    records.push(...(data as Expense[]));
    if (data.length < pageSize) return records;
  }
}

export async function getExpenses(selectedMonth: string) {
  const { start, end } = getMonthDateRange(selectedMonth);

  const { data, error } = await supabase
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
      ascending: false,
    });

  if (error) {
    logServiceError("Failed to fetch expenses", error);
    throw error;
  }

  return data || [];
}

export async function createExpense(payload: ExpensePayload) {
  const { data, error } = await insertExpensePayload(payload);

  if (!error) {
    try {
      const adjustError = await adjustExpenseAsset(
        -Number(payload.amount || 0),
        normalizeCurrency(payload.currency),
        payload.asset_id
      );
      if (adjustError) {
        if (data?.id) await supabase.from("expenses").delete().eq("id", data.id);
        return adjustError;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("asset:updated"));
      }
    } catch (e) {
      logServiceError("Failed to adjust asset after expense create", e);
    }
  }

  return error;
}

export async function updateExpense(
  id: number,
  payload: Partial<ExpensePayload>
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
  const prevAssetId = existingExpense.asset_id ?? null;
  const newAssetId = payload.asset_id === undefined ? prevAssetId : payload.asset_id;

  const { error } = await supabase
    .from("expenses")
    .update(payload)
    .eq("id", id);

  if (!error) {
    try {
      if (existingExpense.payment_installment_id) {
        // The database trigger adjusts the original asset in the same transaction.
      } else if (prevCurrency === newCurrency && prevAssetId === newAssetId) {
        const adjustError = await adjustExpenseAsset(prevAmount - newAmount, newCurrency, newAssetId);
        if (adjustError) return adjustError;
      } else {
        const restoreError = await adjustExpenseAsset(prevAmount, prevCurrency, prevAssetId);
        if (restoreError) return restoreError;
        const deductError = await adjustExpenseAsset(-newAmount, newCurrency, newAssetId);
        if (deductError) return deductError;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("asset:updated"));
      }
    } catch (e) {
      logServiceError("Failed to adjust asset after expense update", e);
    }
  }

  return error;
}

export async function removeExpense(id: number) {
  const { data: existing, error: fetchErr } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr) return fetchErr;

  const existingExpense = existing as Expense;
  const prevAmount = Number(existingExpense.amount || 0);
  const prevCurrency = normalizeCurrency(existingExpense.currency);
  const prevAssetId = existingExpense.asset_id ?? null;

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);

  if (!error && prevAmount !== 0) {
    try {
      if (!existingExpense.payment_installment_id) {
        const adjustError = await adjustExpenseAsset(prevAmount, prevCurrency, prevAssetId);
        if (adjustError) return adjustError;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("asset:updated"));
      }
    } catch (e) {
      logServiceError("Failed to adjust asset after expense delete", e);
    }
  }

  return error;
}

export async function removeExpensesByMonth(selectedMonth: string) {
  const { start, end } = getMonthDateRange(selectedMonth);

  const { data: existing, error: fetchErr } = await supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", start)
    .lte("expense_date", end);

  if (fetchErr) return fetchErr;

  const removedTotals = ((existing || []) as Expense[]).reduce((totals, expense) => {
    if (expense.payment_installment_id) return totals;
    const currency = normalizeCurrency(expense.currency);
    const key = `${currency}:${expense.asset_id ?? ""}`;
    totals[key] = (totals[key] || 0) + Number(expense.amount || 0);
    return totals;
  }, {} as Record<string, number>);

  const { error } = await supabase
    .from("expenses")
    .delete()
    .gte("expense_date", start)
    .lte("expense_date", end);

  if (!error) {
    try {
      await Promise.all(
        Object.entries(removedTotals).map(([key, total]) => {
          const [currency, assetId] = key.split(":");
          return adjustExpenseAsset(total, currency as Currency, assetId ? Number(assetId) : null);
        }
        )
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("asset:updated"));
      }
    } catch (e) {
      logServiceError("Failed to adjust asset after monthly expense delete", e);
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
  sortField = "expense_date",
  sortDirection: "asc" | "desc" = "desc",
  currency?: Currency
) {
  const { start, end } = getMonthDateRange(selectedMonth);

  let query = supabase
    .from("expenses")
    .select(
      `*, categories ( id, name, type_id, types ( id, name ) )`,
      { count: "exact" }
    )
    .gte("expense_date", start)
    .lte("expense_date", end)
    .range(offset, offset + limit - 1)
    .order(sortField, { ascending: sortDirection === "asc" });

  if (categoryId !== null) {
    query = query.eq("category_id", categoryId);
  }

  if (search) {
    query = query.ilike("note", `%${search}%`);
  }

  if (currency) {
    query = query.eq("currency", currency);
  }

  const { data, count, error } = await query;

  if (error) {
    logServiceError("Failed to fetch expenses by category", error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}
