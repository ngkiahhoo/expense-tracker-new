"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";

import { getDashboardHistory } from "@/services/dashboardHistoryService";
import type { Currency } from "@/types/currency";
import type { Expense } from "@/types/expense";
import type { Income } from "@/types/income";
import { logServiceError } from "@/utils/logger";

export default function useDashboardHistory(
  activeCurrency:Currency
) {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [error, setError] = useState("");
  const [loadedCurrency, setLoadedCurrency] = useState("");
  const request = useRef(0);

  const fetchDashboardHistory = useCallback(async () => {
    const id = ++request.current;
    try {
      const history = await getDashboardHistory(activeCurrency);
      if (id !== request.current) return history;
      setAllExpenses(history.expenses);
      setAllIncomes(history.incomes);
      setLoadedCurrency(activeCurrency);
      setError("");
      return history;
    } catch (error) {
      logServiceError("Failed to load full monthly history", error);
      if (id === request.current) setError("Could not load analytics history. Retry to refresh.");
      return {
        expenses: [],
        incomes: [],
      };
    }
  }, [activeCurrency]);

  return {
    allExpenses,
    allIncomes,
    error,
    loading: loadedCurrency !== activeCurrency && !error,
    fetchDashboardHistory,
  };
}
