"use client";

import { useMemo } from "react";

import { getCategoryBreakdown } from "../services/analyticsService";
import type { CategoryBreakdownItem } from "../types/analytics";
import type { Expense } from "../types/expense";
import type { Category } from "../types/category";
import type { Currency } from "../types/currency";
import { DEFAULT_CURRENCY, normalizeCurrency } from "../utils/currency";

export default function useCategoryBreakdown(
  expenses: Expense[],
  categories: Category[],
  activeCurrency: Currency = DEFAULT_CURRENCY
): CategoryBreakdownItem[] {
  return useMemo(
    () =>
      getCategoryBreakdown(
        expenses.filter(
          (expense) =>
            normalizeCurrency(expense.currency) ===
            activeCurrency
        ),
        categories
      ),
    [expenses, categories, activeCurrency]
  );
}
