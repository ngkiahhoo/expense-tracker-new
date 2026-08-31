"use client";

import { useMemo } from "react";

import type { Expense } from "@/types/expense";
import type { Income } from "@/types/income";

export interface MonthlySeriesItem {
  balance:number;
  expense:number;
  income:number;
  label:string;
  monthKey:string;
}

function getRecordMonth(dateValue?:string) {
  return dateValue?.split("T")[0]?.slice(0, 7) || "";
}

function formatMonthLabel(monthKey:string) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function useMonthlySeries(
  expenses:Expense[],
  incomes:Income[]
):MonthlySeriesItem[] {
  return useMemo(() => {
    const monthKeys = Array.from(
      new Set([
        ...expenses.map((expense) => getRecordMonth(expense.expense_date)),
        ...incomes.map((income) => getRecordMonth(income.income_date)),
      ].filter(Boolean))
    ).sort((left, right) => left.localeCompare(right));

    return monthKeys.map((monthKey) => {
      const monthlyExpense = expenses
        .filter((expense) => getRecordMonth(expense.expense_date) === monthKey)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      const monthlyIncome = incomes
        .filter((income) => getRecordMonth(income.income_date) === monthKey)
        .reduce((sum, income) => sum + Number(income.amount || 0), 0);

      return {
        monthKey,
        label: formatMonthLabel(monthKey),
        income: monthlyIncome,
        expense: monthlyExpense,
        balance: monthlyIncome - monthlyExpense,
      };
    });
  }, [expenses, incomes]);
}
