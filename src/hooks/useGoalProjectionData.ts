"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Asset } from "../types/asset";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import type { PaymentPlan } from "../types/paymentPlan";
import { addMonths } from "../utils/expenseMath";

export default function useGoalProjectionData(today: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [history, setHistory] = useState<{ expenses: Expense[]; incomes: Income[] } | null>(null);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    let alive = true, request = 0;
    const end = `${today.slice(0, 7)}-01`, start = addMonths(end, -3);
    async function readHistory(table: "expenses" | "incomes", dateColumn: string) {
      const rows: (Expense | Income)[] = [];
      for (let offset = 0; ; offset += 500) {
        const result = await supabase.from(table).select("*").gte(dateColumn, start).lt(dateColumn, end).order("id").range(offset, offset + 499);
        if (result.error) throw result.error;
        rows.push(...result.data);
        if (result.data.length < 500) return rows;
      }
    }
    async function refresh() {
      const id = ++request;
      try {
        const payments = await supabase.from("payment_plans").select("*, payment_installments(*)");
        if (!payments.error && alive && id === request) setPaymentPlans((payments.data || []) as PaymentPlan[]);
      } catch { /* Payment plans are optional until their migration is installed. */ }
      try {
        const rows: Asset[] = [];
        for (let offset = 0; ; offset += 500) {
          const result = await supabase.from("assets").select("*").order("id").range(offset, offset + 499);
          if (result.error) throw result.error;
          rows.push(...result.data as Asset[]);
          if (result.data.length < 500) break;
        }
        if (alive && id === request) { setAssets(rows); setError(""); }
      } catch {
        if (alive && id === request) setError("Could not load current assets. Retry before using this projection.");
      } finally {
        if (alive && id === request) setLoading(false);
      }
      if (!alive || id !== request) return;
      try {
        const [expenses, incomes] = await Promise.all([readHistory("expenses", "expense_date"), readHistory("incomes", "income_date")]);
        if (alive && id === request) { setHistory({ expenses: expenses as Expense[], incomes: incomes as Income[] }); setHistoryError(""); }
      } catch {
        if (alive && id === request) { setHistory(null); setHistoryError("Reality Check is unavailable. The plan projection is unchanged."); }
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("asset:updated", refresh);
    window.addEventListener("transactions:changed", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { alive = false; clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("asset:updated", refresh); window.removeEventListener("transactions:changed", refresh); };
  }, [today, retryCount]);
  return { assets, history, paymentPlans, loading, error, historyError, retry: () => setRetryCount(count => count + 1) };
}
