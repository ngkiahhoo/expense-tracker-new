"use client";

import {
  useCallback,
  useState,
} from "react";

import {
  fetchCategories,
  fetchExpensesRange,
  fetchIncomesRange,
} from "../services/exportService";
import {
  formatAIExport,
} from "../utils/formatAIExport";
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
  income:number;
  expense:number;
  needs:number;
  wants:number;
  savings:number;
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
      const [expenses, incomes, categories] = await Promise.all([
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

        monthlyMap[month] =
          monthlyMap[month] || {
            income: 0,
            expense: 0,
            needs: 0,
            wants: 0,
            savings: 0,
            transaction_count: 0,
          };

        monthlyMap[month].income += Number(inc.amount || 0);
      });

      expenses.forEach((e: Expense) => {
        const month = e.expense_date.slice(0, 7);

        monthlyMap[month] =
          monthlyMap[month] || {
            income: 0,
            expense: 0,
            needs: 0,
            wants: 0,
            savings: 0,
            transaction_count: 0,
          };

        monthlyMap[month].expense += Number(e.amount || 0);
        monthlyMap[month].transaction_count += 1;
        const typeName = e.categories?.types?.name?.toLowerCase();
        if (typeName === "needs") monthlyMap[month].needs += Number(e.amount || 0);
        else if (typeName === "wants") monthlyMap[month].wants += Number(e.amount || 0);
        else if (typeName === "savings") monthlyMap[month].savings += Number(e.amount || 0);
      });

      const monthlySummaries: MonthlySummary[] = Object.keys(monthlyMap)
        .sort()
        .map((month) => {
          const m = monthlyMap[month];
          const income = m.income || 0;
          const expense = m.expense || 0;
          const balance =
            income - expense;
          const saving_rate = income > 0 ? (balance / income) * 100 : 0;
          const needs_ratio = income > 0 ? (m.needs / income) * 100 : 0;
          const wants_ratio = income > 0 ? (m.wants / income) * 100 : 0;
          const savings_ratio = income > 0 ? (m.savings / income) * 100 : 0;
          return {
            month,
            income,
            expense,
            balance:
              Number(
                balance.toFixed(2)
              ),
            saving_rate: Number(saving_rate.toFixed(1)),
            needs_ratio: Number(needs_ratio.toFixed(1)),
            wants_ratio: Number(wants_ratio.toFixed(1)),
            savings_ratio: Number(savings_ratio.toFixed(1)),
            transaction_count: m.transaction_count || 0,
          };
        });

      const out = formatAIExport(expenses, incomes, categories, monthlySummaries, {
        includeExpenses: options.includeExpenses,
        includeMonthlySummary: options.includeMonthlySummary,
        includeCategories: options.includeCategories,
        includeAIPrompt: options.includeAIPrompt,
      });

      setPayload(out);
      setLoading(false);
      return out;
    } catch (err: unknown) {
      console.log(err);
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

    // Try modern Clipboard API first (for modern browsers including iOS 13.3+)
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(toCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return true;
      } catch (e) {
        console.warn('clipboard.writeText failed', e);
        // fallthrough to fallback
      }
    }

    // Fallback 1: Using contenteditable div (better for iOS)
    try {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.textContent = toCopy;
      div.style.position = 'fixed';
      div.style.left = '0';
      div.style.top = '0';
      div.style.zIndex = '-9999';
      div.style.opacity = '0';
      document.body.appendChild(div);
      
      const range = document.createRange();
      range.selectNodeContents(div);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      div.focus();
      
      const ok = document.execCommand('copy');
      document.body.removeChild(div);
      
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return true;
      }
    } catch (err) {
      console.warn('contenteditable copy failed', err);
    }

    // Fallback 2: Using textarea + execCommand with setSelectionRange
    try {
      const ta = document.createElement('textarea');
      ta.value = toCopy;
      ta.style.position = 'fixed';
      ta.style.left = '0';
      ta.style.top = '0';
      ta.style.zIndex = '-9999';
      ta.style.opacity = '0';
      ta.style.fontSize = '16px'; // Prevent zoom on iOS
      document.body.appendChild(ta);
      ta.focus();
      ta.setSelectionRange(0, ta.value.length);
      
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return true;
      }
    } catch (err) {
      console.warn('textarea copy failed', err);
    }

    // Fallback 3: Using textarea + select() for older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = toCopy;
      ta.style.position = 'fixed';
      ta.style.left = '0';
      ta.style.top = '0';
      ta.style.zIndex = '-9999';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return true;
      }
    } catch (err) {
      console.warn('select copy failed', err);
    }

    // All methods failed - show modal for manual copy
    console.error('All copy methods failed, showing modal');
    setShowModal(true);
    setError('Copy failed. Use the modal below to copy manually.');
    return false;
  }, [payload]);

  return { loading, copied, error, payload, generateExport, copyToClipboard, showModal, setShowModal };
}
