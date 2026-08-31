"use client";

import { useMemo } from "react";

import type { Category } from "@/types/category";
import type { Currency } from "@/types/currency";
import type { Expense } from "@/types/expense";
import { normalizeCurrency } from "@/utils/currency";

export type SheetLevel =
  | "types"
  | "categories"
  | "records";

export interface TypeSummary {
  expenses:Expense[];
  name:string;
  totalAmount:number;
}

export interface CategorySummary {
  categoryId:number | null;
  categoryName:string;
  expenses:Expense[];
  key:string;
  totalAmount:number;
}

function getExpenseCategory(
  expense:Expense,
  categories:Category[]
) {
  return expense.categories ||
    categories.find((item) => item.id === expense.category_id);
}

function getCategoryKey(
  category:Category | undefined
) {
  const categoryName = category?.name || "Uncategorized";
  const categoryId = category?.id ?? null;

  return {
    categoryId,
    categoryName,
    key: `${categoryId ?? "uncategorized"}:${categoryName}`,
  };
}

export default function useCategoryExpenseSheetData({
  categories,
  currency,
  expenses,
  level,
  selectedCategoryKey,
  selectedMonth,
  selectedTypeName,
}:{
  categories:Category[];
  currency:Currency;
  expenses:Expense[];
  level:SheetLevel;
  selectedCategoryKey:string | null;
  selectedMonth:string;
  selectedTypeName:string | null;
}) {
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const date = (expense.expense_date || "").split("T")[0];

      return (
        date.startsWith(selectedMonth) &&
        normalizeCurrency(expense.currency) === currency
      );
    });
  }, [currency, expenses, selectedMonth]);

  const typeSummaries = useMemo(() => {
    const map = new Map<string, TypeSummary>();

    filteredExpenses.forEach((expense) => {
      const category = getExpenseCategory(expense, categories);
      const typeName = category?.types?.name || "Uncategorized";
      const existing = map.get(typeName);

      if (existing) {
        existing.totalAmount += Number(expense.amount || 0);
        existing.expenses.push(expense);
        return;
      }

      map.set(typeName, {
        name: typeName,
        totalAmount: Number(expense.amount || 0),
        expenses: [expense],
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [categories, filteredExpenses]);

  const categorySummaries = useMemo(() => {
    if (!selectedTypeName) {
      return [];
    }

    const map = new Map<string, CategorySummary>();

    filteredExpenses.forEach((expense) => {
      const category = getExpenseCategory(expense, categories);
      const typeName = category?.types?.name || "Uncategorized";

      if (typeName !== selectedTypeName) {
        return;
      }

      const categoryInfo = getCategoryKey(category);
      const existing = map.get(categoryInfo.key);

      if (existing) {
        existing.totalAmount += Number(expense.amount || 0);
        existing.expenses.push(expense);
        return;
      }

      map.set(categoryInfo.key, {
        ...categoryInfo,
        totalAmount: Number(expense.amount || 0),
        expenses: [expense],
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [categories, filteredExpenses, selectedTypeName]);

  const recordItems = useMemo(() => {
    if (!selectedCategoryKey || !selectedTypeName) {
      return [];
    }

    return filteredExpenses.filter((expense) => {
      const category = getExpenseCategory(expense, categories);
      const typeName = category?.types?.name || "Uncategorized";
      const { key } = getCategoryKey(category);

      return typeName === selectedTypeName && key === selectedCategoryKey;
    });
  }, [categories, filteredExpenses, selectedCategoryKey, selectedTypeName]);

  const currentTotal = useMemo(() => {
    if (level === "categories") {
      return categorySummaries.reduce((sum, item) => sum + item.totalAmount, 0);
    }

    if (level === "records") {
      return recordItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }

    return filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [categorySummaries, filteredExpenses, level, recordItems]);

  return {
    categorySummaries,
    currentTotal,
    recordItems,
    typeSummaries,
  };
}
