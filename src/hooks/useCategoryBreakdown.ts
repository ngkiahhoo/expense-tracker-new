"use client";

import { useMemo } from "react";

import { getCategoryBreakdown } from "../services/analyticsService";
import type { CategoryBreakdownItem } from "../types/analytics";
import type { Expense } from "../types/expense";
import type { Category } from "../types/category";

export default function useCategoryBreakdown(
  expenses: Expense[],
  categories: Category[]
): CategoryBreakdownItem[] {
  return useMemo(
    () => getCategoryBreakdown(expenses, categories),
    [expenses, categories]
  );
}
