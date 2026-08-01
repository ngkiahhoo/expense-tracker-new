"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
} from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import {
  cn,
  emptyStateStyles,
  fieldStyles,
  overlayStyles,
} from "@/components/ui/styles";
import { getExpensesByCategory } from "../../../services/expenseService";
import { confirmDelete } from "../../../utils/confirm";

import type { Expense } from "../../../types/expense";
import type { Currency } from "../../../types/currency";
import { currencyLabel, formatCurrencyAmount } from "../../../utils/currency";

interface CategoryExpenseSheetProps {
  isOpen: boolean;
  categoryId: number | null;
  categoryName: string;
  categoryTotal: number;
  categoryPercent: number;
  selectedMonth: string;
  currency: Currency;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
}

const PAGE_SIZE = 10;

function formatDate(dateString: string) {
  return dateString;
}

export default function CategoryExpenseSheet({
  isOpen,
  categoryId,
  categoryName,
  categoryTotal,
  categoryPercent,
  selectedMonth,
  currency,
  onClose,
  onEdit,
  onDelete,
}: CategoryExpenseSheetProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<"expense_date" | "amount">(
    "expense_date"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const offset = (page - 1) * PAGE_SIZE;

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
    if (!isOpen) return;

    let mounted = true;

    async function fetch() {
      setLoading(true);

      const { data, count } = await getExpensesByCategory(
        selectedMonth,
        categoryId,
        query || null,
        PAGE_SIZE,
        offset,
        sortField,
        sortDirection,
        currency
      );

      if (!mounted) return;

      setExpenses(data as Expense[]);
      setTotalCount(count || 0);
      setLoading(false);
    }

    fetch();

    return () => {
      mounted = false;
    };
  }, [
    isOpen,
    categoryId,
    selectedMonth,
    query,
    page,
    sortField,
    sortDirection,
    currency,
    offset,
  ]);

  useEffect(() => {
    setPage(1);
  }, [categoryId, query, sortField, sortDirection]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    [totalCount]
  );

  if (!isOpen) return null;

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className={overlayStyles.bottomSheet} onClick={onClose}>
      <div
        className={cn(overlayStyles.sheetPanel, "max-w-3xl")}
        onClick={(event) => event.stopPropagation()}
        onFocusCapture={handleDialogFocus}
      >
        <div className={overlayStyles.stickyHeader}>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Category details
            </p>
            <h2 className="text-xl font-bold text-white">{categoryName}</h2>
            <p className="text-sm text-zinc-400">
              {currencyLabel(currency)} {categoryTotal.toFixed(2)} - {categoryPercent}% of month
              spending
            </p>
          </div>

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

        <div className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div
              className={cn(
                fieldStyles.base,
                "flex items-center gap-3 px-4"
              )}
            >
              <Search size={16} className="text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, note"
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={sortField}
                onChange={(event) =>
                  setSortField(event.target.value as "expense_date" | "amount")
                }
                fieldSize="md"
              >
                <option value="expense_date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
              </Select>

              <Button
                onClick={() =>
                  setSortDirection((current) =>
                    current === "asc" ? "desc" : "asc"
                  )
                }
                variant="outline"
                size="iconLg"
                title="Toggle sort direction"
                aria-label="Toggle sort direction"
              >
                {sortDirection === "asc" ? (
                  <ArrowUpAZ size={18} />
                ) : (
                  <ArrowDownAZ size={18} />
                )}
              </Button>
            </div>
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse rounded-2xl bg-zinc-900 p-4"
                  >
                    <div className="mb-3 h-4 w-3/4 rounded bg-zinc-800" />
                    <div className="h-4 w-1/2 rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className={emptyStateStyles}>
                <p className="text-lg font-semibold text-white">
                  No records in this category
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  Add expenses in this category to see records here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
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
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-zinc-400">
              {rangeStart} - {rangeEnd} of {totalCount}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                variant="outline"
                size="sm"
              >
                Prev
              </Button>
              <div className="rounded-2xl bg-zinc-900 px-3 py-2">
                Page {page} / {totalPages}
              </div>
              <Button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
