"use client";
import { useEffect, useState } from "react";
import { getAllExpenseRecords } from "../services/expenseService";
import type { Expense } from "../types/expense";

export default function useExpenseRecords() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true, request = 0;
    async function refresh() {
      const id = ++request;
      setLoading(true);
      try {
        const records = await getAllExpenseRecords();
        if (alive && id === request) { setExpenses(records); setError(""); }
      } catch {
        if (alive && id === request) setError("Could not load expense records. Return to this tab to retry.");
      } finally {
        if (alive && id === request) setLoading(false);
      }
    }
    void refresh();
    window.addEventListener("transactions:changed", refresh);
    window.addEventListener("focus", refresh);
    return () => { alive = false; window.removeEventListener("transactions:changed", refresh); window.removeEventListener("focus", refresh); };
  }, [revision]);
  return { expenses, loading, error, retry: () => setRevision(value => value + 1) };
}
