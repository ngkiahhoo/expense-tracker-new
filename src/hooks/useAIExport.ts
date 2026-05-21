"use client";

import { useCallback, useState } from "react";
import { fetchExpensesRange, fetchIncomesRange, fetchCategories } from "../services/exportService";
import { formatAIExport } from "../utils/formatAIExport";
import type { ExportOptions, ExportRange } from "../types/export";

function rangeToDates(range: ExportRange) {
  const end = new Date();
  const start = new Date();
  if (range === "30d") {
    start.setDate(end.getDate() - 30);
  } else if (range === "3m") {
    start.setMonth(end.getMonth() - 3);
  } else if (range === "6m") {
    start.setMonth(end.getMonth() - 6);
  } else if (range === "1y") {
    start.setFullYear(end.getFullYear() - 1);
  } else {
    // all
    start.setFullYear(1970, 0, 1);
  }

  const toISO = (d: Date) => d.toISOString().split("T")[0];
  return { start: toISO(start), end: toISO(end) };
}

export default function useAIExport() {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAndCopy = useCallback(async (
    range: ExportRange,
    options: ExportOptions
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { start, end } = rangeToDates(range);
      const [expenses, incomes, categories] = await Promise.all([
        fetchExpensesRange(start, end),
        fetchIncomesRange(start, end),
        fetchCategories(),
      ]);

      // Build monthly summaries
      const monthlyMap: Record<string, any> = {};

      // incomes by month
      incomes.forEach((inc: any) => {
        const month = inc.income_date?.slice(0, 7) || inc.date?.slice(0, 7);
        monthlyMap[month] = monthlyMap[month] || { income: 0, expense: 0, needs: 0, wants: 0, savings: 0, transaction_count: 0 };
        monthlyMap[month].income += Number(inc.amount || 0);
      });

      expenses.forEach((e: any) => {
        const month = e.expense_date.slice(0, 7);
        monthlyMap[month] = monthlyMap[month] || { income: 0, expense: 0, needs: 0, wants: 0, savings: 0, transaction_count: 0 };
        monthlyMap[month].expense += Number(e.amount || 0);
        monthlyMap[month].transaction_count += 1;
        const typeName = e.categories?.types?.name?.toLowerCase();
        if (typeName === "needs") monthlyMap[month].needs += Number(e.amount || 0);
        else if (typeName === "wants") monthlyMap[month].wants += Number(e.amount || 0);
        else if (typeName === "savings") monthlyMap[month].savings += Number(e.amount || 0);
      });

      const monthlySummaries = Object.keys(monthlyMap)
        .sort()
        .map((month) => {
          const m = monthlyMap[month];
          const income = m.income || 0;
          const expense = m.expense || 0;
          const saving_rate = income > 0 ? ((income - expense) / income) * 100 : 0;
          const needs_ratio = income > 0 ? (m.needs / income) * 100 : 0;
          const wants_ratio = income > 0 ? (m.wants / income) * 100 : 0;
          const savings_ratio = income > 0 ? (m.savings / income) * 100 : 0;
          return {
            month,
            income,
            expense,
            saving_rate: Number(saving_rate.toFixed(1)),
            needs_ratio: Number(needs_ratio.toFixed(1)),
            wants_ratio: Number(wants_ratio.toFixed(1)),
            savings_ratio: Number(savings_ratio.toFixed(1)),
            transaction_count: m.transaction_count || 0,
          };
        });

      const payload = formatAIExport(expenses, incomes, categories, monthlySummaries, {
        includeExpenses: options.includeExpenses,
        includeMonthlySummary: options.includeMonthlySummary,
        includeCategories: options.includeCategories,
        includeAIPrompt: options.includeAIPrompt,
      });

      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);

      setLoading(false);
      return true;
    } catch (err: any) {
      console.log(err);
      setError(err.message || String(err));
      setLoading(false);
      return false;
    }
  }, []);

  return { loading, copied, error, generateAndCopy };
}
