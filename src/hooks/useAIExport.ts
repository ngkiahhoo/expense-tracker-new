"use client";

import {
  useCallback,
  useState,
} from "react";

import {
  fetchAssets,
  fetchCategories,
  fetchExpensesRange,
  fetchIncomesRange,
} from "../services/exportService";
import {
  formatAIExport,
} from "../utils/formatAIExport";
import { copyTextToClipboard } from "../utils/clipboard";
import { logServiceError } from "../utils/logger";
import type {
  ExportOptions,
  ExportRange,
  MonthlySummary,
} from "../types/export";
import type {
  Expense,
} from "../types/expense";
import type {
  Income,
} from "../types/income";

interface MonthlyAccumulator {
  currency:string;
  income:number;
  expense:number;
  needs:number;
  commitment:number;
  wants:number;
  transaction_count:number;
}

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
  const [payload, setPayload] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const generateExport = useCallback(async (
    range: ExportRange,
    options: ExportOptions
  ) => {
    setLoading(true);
    setCopied(false);
    setError(null);
    setPayload(null);

    try {
      const { start, end } = rangeToDates(range);
      const [assets, expenses, incomes, categories] = await Promise.all([
        fetchAssets(),
        fetchExpensesRange(start, end),
        fetchIncomesRange(start, end),
        fetchCategories(),
      ]);

      // Build monthly summaries
      const monthlyMap: Record<string, MonthlyAccumulator> = {};

      // incomes by month
      incomes.forEach((inc: Income) => {
        const month =
          inc.income_date?.slice(0, 7);

        if (!month) {
          return;
        }

        const currency = inc.currency || "MYR";
        const key = `${month}-${currency}`;

        monthlyMap[key] =
          monthlyMap[key] || {
            currency,
            income: 0,
            expense: 0,
            needs: 0,
            commitment: 0,
            wants: 0,
            transaction_count: 0,
          };

        monthlyMap[key].income += Number(inc.amount || 0);
      });

      expenses.forEach((e: Expense) => {
        const month = e.expense_date.slice(0, 7);
        const currency = e.currency || "MYR";
        const key = `${month}-${currency}`;

        monthlyMap[key] =
          monthlyMap[key] || {
            currency,
            income: 0,
            expense: 0,
            needs: 0,
            commitment: 0,
            wants: 0,
            transaction_count: 0,
          };

        monthlyMap[key].expense += Number(e.amount || 0);
        monthlyMap[key].transaction_count += 1;
        const typeName = e.categories?.types?.name?.toLowerCase();
        if (typeName === "needs") monthlyMap[key].needs += Number(e.amount || 0);
        else if (typeName === "commitment") monthlyMap[key].commitment += Number(e.amount || 0);
        else if (typeName === "wants") monthlyMap[key].wants += Number(e.amount || 0);
      });

      const monthlySummaries: MonthlySummary[] = Object.keys(monthlyMap)
        .sort()
        .map((key) => {
          const m = monthlyMap[key];
          const month = key.slice(0, 7);
          const income = m.income || 0;
          const expense = m.expense || 0;
          const balance =
            income - expense;
          const saving_rate = income > 0 ? (balance / income) * 100 : 0;
          const needs_ratio = income > 0 ? (m.needs / income) * 100 : 0;
          const commitment_ratio = income > 0 ? (m.commitment / income) * 100 : 0;
          const wants_ratio = income > 0 ? (m.wants / income) * 100 : 0;
          return {
            month,
            currency: m.currency,
            income,
            expense,
            balance:
              Number(
                balance.toFixed(2)
              ),
            saving_rate: Number(saving_rate.toFixed(1)),
            needs_ratio: Number(needs_ratio.toFixed(1)),
            commitment_ratio: Number(commitment_ratio.toFixed(1)),
            wants_ratio: Number(wants_ratio.toFixed(1)),
            transaction_count: m.transaction_count || 0,
          };
        });

      const out = formatAIExport(
        assets,
        expenses,
        incomes,
        categories,
        monthlySummaries,
        {
          includeAssets: options.includeAssets,
          includeIncomes: options.includeIncomes,
          includeExpenses: options.includeExpenses,
          includeMonthlySummary: options.includeMonthlySummary,
          includeCategories: options.includeCategories,
          includeAIPrompt: options.includeAIPrompt,
        }
      );

      setPayload(out);
      setLoading(false);
      return out;
    } catch (err: unknown) {
      logServiceError("Failed to generate AI export", err);
      setError(
        err instanceof Error
          ? err.message
          : String(err)
      );
      setLoading(false);
      return null;
    }
  }, []);

  const copyToClipboard = useCallback(async (text?: string) => {
    const toCopy = text ?? payload;
    if (!toCopy) return false;
    setError(null);

    const copiedToClipboard = await copyTextToClipboard(toCopy);

    if (copiedToClipboard) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      return true;
    }

    logServiceError("All copy methods failed, showing modal", null);
    setShowModal(true);
    setError("Copy failed. Use the modal below to copy manually.");
    return false;
  }, [payload]);

  return { loading, copied, error, payload, generateExport, copyToClipboard, showModal, setShowModal };
}
