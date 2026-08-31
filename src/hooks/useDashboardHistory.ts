"use client";

import {
  useCallback,
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

  const fetchDashboardHistory = useCallback(async () => {
    try {
      const history = await getDashboardHistory(activeCurrency);
      setAllExpenses(history.expenses);
      setAllIncomes(history.incomes);
      return history;
    } catch (error) {
      logServiceError("Failed to load full monthly history", error);
      setAllExpenses([]);
      setAllIncomes([]);
      return {
        expenses: [],
        incomes: [],
      };
    }
  }, [activeCurrency]);

  return {
    allExpenses,
    allIncomes,
    fetchDashboardHistory,
  };
}
