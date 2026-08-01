"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
} from "react";
import {
  ArrowLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  cn,
  emptyStateStyles,
  overlayStyles,
} from "@/components/ui/styles";
import { confirmDelete } from "../../../utils/confirm";

import type { Expense } from "../../../types/expense";
import type { Category } from "../../../types/category";
import type { Currency } from "../../../types/currency";
import { currencyLabel, formatCurrencyAmount, normalizeCurrency } from "../../../utils/currency";

type SheetLevel = "types" | "categories" | "records";

interface CategoryExpenseSheetProps {
  isOpen: boolean;
  categoryId?: number | null;
  categoryName?: string;
  categoryTotal?: number;
  categoryPercent?: number;
  selectedMonth: string;
  currency: Currency;
  expenses: Expense[];
  categories: Category[];
  initialCategoryKey?: string | null;
  initialCategoryName?: string | null;
  initialTypeName?: string | null;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
}

interface TypeSummary {
  name: string;
  totalAmount: number;
  expenses: Expense[];
}

interface CategorySummary {
  key: string;
  categoryId: number | null;
  categoryName: string;
  totalAmount: number;
  expenses: Expense[];
}

function formatDate(dateString: string) {
  return dateString;
}

export default function CategoryExpenseSheet({
  isOpen,
  selectedMonth,
  currency,
  expenses,
  categories,
  initialCategoryKey,
  initialCategoryName,
  initialTypeName,
  onClose,
  onEdit,
  onDelete,
}: CategoryExpenseSheetProps) {
  const [level, setLevel] = useState<SheetLevel>("types");
  const [selectedTypeName, setSelectedTypeName] = useState<string | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  function handleDialogFocus(event: FocusEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    const target = event.target;
    const tagName = target.tagName;

    if (
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT"
    ) {
      setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 150);
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setLevel("types");
      setSelectedTypeName(null);
      setSelectedCategoryKey(null);
      setSelectedCategoryName(null);
      return;
    }

    if (initialCategoryKey && initialCategoryName) {
      setSelectedTypeName(initialTypeName ?? null);
      setSelectedCategoryKey(initialCategoryKey);
      setSelectedCategoryName(initialCategoryName);
      setLevel("records");
      return;
    }

    setLevel("types");
    setSelectedTypeName(null);
    setSelectedCategoryKey(null);
    setSelectedCategoryName(null);
  }, [isOpen, initialCategoryKey, initialCategoryName, initialTypeName]);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter((expense) => {
      const date = (expense.expense_date || "").split("T")[0];
      return (
        date.startsWith(selectedMonth) &&
        normalizeCurrency(expense.currency) === currency
      );
    });
  }, [expenses, selectedMonth, currency]);

  const typeSummaries = useMemo(() => {
    const map = new Map<string, TypeSummary>();

    filteredExpenses.forEach((expense) => {
      const category = expense.categories || categories.find((item) => item.id === expense.category_id);
      const typeName = category?.types?.name || "Uncategorized";
      const existing = map.get(typeName);

      if (existing) {
        existing.totalAmount += Number(expense.amount || 0);
        existing.expenses.push(expense);
      } else {
        map.set(typeName, {
          name: typeName,
          totalAmount: Number(expense.amount || 0),
          expenses: [expense],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredExpenses, categories]);

  const categorySummaries = useMemo(() => {
    if (!selectedTypeName) return [] as CategorySummary[];

    const map = new Map<string, CategorySummary>();

    filteredExpenses.forEach((expense) => {
      const category = expense.categories || categories.find((item) => item.id === expense.category_id);
      const typeName = category?.types?.name || "Uncategorized";

      if (typeName !== selectedTypeName) return;

      const categoryName = category?.name || "Uncategorized";
      const categoryId = category?.id ?? null;
      const key = `${categoryId ?? "uncategorized"}:${categoryName}`;
      const existing = map.get(key);

      if (existing) {
        existing.totalAmount += Number(expense.amount || 0);
        existing.expenses.push(expense);
      } else {
        map.set(key, {
          key,
          categoryId,
          categoryName,
          totalAmount: Number(expense.amount || 0),
          expenses: [expense],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredExpenses, categories, selectedTypeName]);

  const recordItems = useMemo(() => {
    if (!selectedCategoryKey || !selectedTypeName) return [] as Expense[];

    return filteredExpenses.filter((expense) => {
      const category = expense.categories || categories.find((item) => item.id === expense.category_id);
      const typeName = category?.types?.name || "Uncategorized";
      const categoryName = category?.name || "Uncategorized";
      const key = `${category?.id ?? "uncategorized"}:${categoryName}`;
      return typeName === selectedTypeName && key === selectedCategoryKey;
    });
  }, [filteredExpenses, categories, selectedTypeName, selectedCategoryKey]);

  const currentTotal = useMemo(() => {
    if (level === "categories") {
      return categorySummaries.reduce((sum, item) => sum + item.totalAmount, 0);
    }

    if (level === "records") {
      return recordItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }

    return filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [categorySummaries, filteredExpenses, level, recordItems]);

  if (!isOpen) return null;

  function handleBack() {
    if (level === "records") {
      setSelectedCategoryKey(null);
      setSelectedCategoryName(null);
      setLevel("categories");
      return;
    }

    if (level === "categories") {
      setSelectedTypeName(null);
      setLevel("types");
      return;
    }
  }

  const headerTitle =
    level === "types"
      ? "Expense breakdown"
      : level === "categories"
      ? selectedTypeName || "Type details"
      : selectedCategoryName || "Expense records";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 px-3 py-3 sm:px-6" onClick={onClose}>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onFocusCapture={handleDialogFocus}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/95 p-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              {level === "types" ? "Expense analysis" : level === "categories" ? "Type details" : "Category details"}
            </p>
            <h2 className="text-xl font-bold text-white">{headerTitle}</h2>
            <p className="text-sm text-zinc-400">
              {currencyLabel(currency)} {formatCurrencyAmount(currentTotal, currency)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {level !== "types" && (
              <Button
                onClick={handleBack}
                title="Back"
                aria-label="Back"
                variant="ghost"
                size="iconLg"
              >
                <ArrowLeft size={18} />
              </Button>
            )}

            <Button
              onClick={onClose}
              title="Close"
              aria-label="Close"
              variant="ghost"
              size="iconLg"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
            {level === "types" && (
              <>
                {typeSummaries.length === 0 ? (
                  <div className={emptyStateStyles}>
                    <p className="text-lg font-semibold text-white">No expense data yet</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      Add expenses for this month to see type totals here.
                    </p>
                  </div>
                ) : (
                  typeSummaries.map((typeItem) => (
                    <button
                      key={typeItem.name}
                      type="button"
                      onClick={() => {
                        setSelectedTypeName(typeItem.name);
                        setLevel("categories");
                      }}
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-left transition hover:border-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">{typeItem.name}</span>
                        <span className="text-sm text-zinc-400">
                          {formatCurrencyAmount(typeItem.totalAmount, currency)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}

            {level === "categories" && (
              <>
                {categorySummaries.length === 0 ? (
                  <div className={emptyStateStyles}>
                    <p className="text-lg font-semibold text-white">No categories in this type</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      Add expenses under this type to see category totals.
                    </p>
                  </div>
                ) : (
                  categorySummaries.map((categoryItem) => (
                    <button
                      key={categoryItem.key}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryKey(categoryItem.key);
                        setSelectedCategoryName(categoryItem.categoryName);
                        setLevel("records");
                      }}
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-left transition hover:border-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-white">{categoryItem.categoryName}</span>
                        <span className="text-sm text-zinc-400">
                          {formatCurrencyAmount(categoryItem.totalAmount, currency)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}

            {level === "records" && (
              <>
                {recordItems.length === 0 ? (
                  <div className={emptyStateStyles}>
                    <p className="text-lg font-semibold text-white">No expense records here</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      There are no expenses in this category for the current view.
                    </p>
                  </div>
                ) : (
                  recordItems.map((expense) => (
                    <Card key={expense.id} variant="default" padding="sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-white">
                            {expense.note || "Expense"}
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">
                            {expense.categories?.name || "Uncategorized"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div className="text-right">
                            <p className="text-lg font-bold text-white">
                              {formatCurrencyAmount(Number(expense.amount), expense.currency)}
                            </p>
                            <p className="text-sm text-zinc-500">
                              {formatDate(expense.expense_date)}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => onEdit(expense)}
                              variant="outline"
                              size="sm"
                            >
                              Edit
                            </Button>
                            <Button
                              onClick={() => {
                                if (confirmDelete("Delete this expense?")) {
                                  onDelete(expense.id);
                                }
                              }}
                              variant="danger"
                              size="sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
