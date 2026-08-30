"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import ActionIconButton from "@/components/ui/ActionIconButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import {
  cn,
  emptyStateStyles,
  fieldStyles,
} from "@/components/ui/styles";
import ExpenseCard from "./ExpenseCard";
import { confirmDelete } from "../utils/confirm";

import type { Expense } from "../types/expense";

type SortField = "name" | "category" | "date" | "note";
type SortDirection = "asc" | "desc";

interface ExpenseRecordsPanelProps {
  expenses: Expense[];
  loading: boolean;
  startEdit: (expense: Expense) => void;
  deleteExpense: (id: number) => void;
  deleteMonthExpenses: (
    selectedMonth: string
  ) => Promise<{ success: boolean; error?: string }>;
  selectedMonth: string;
}

const PAGE_SIZE = 10;

function expenseName(expense: Expense) {
  return expense.note || expense.categories?.name || "Expense";
}

function sortValue(expense: Expense, field: SortField) {
  if (field === "category") {
    return expense.categories?.name || "";
  }

  if (field === "date") {
    return expense.expense_date || "";
  }

  if (field === "note") {
    return expense.note || "";
  }

  return expenseName(expense);
}

function searchHaystack(expense: Expense) {
  return [
    expenseName(expense),
    expense.categories?.name,
    expense.categories?.types?.name,
    expense.note,
    expense.expense_date,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function ExpenseRecordsPanel({
  expenses,
  loading,
  startEdit,
  deleteExpense,
  deleteMonthExpenses,
  selectedMonth,
}: ExpenseRecordsPanelProps) {
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const filteredExpenses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const matched = normalizedQuery
      ? expenses.filter((expense) =>
          searchHaystack(expense).includes(normalizedQuery)
        )
      : expenses;

    return [...matched].sort((a, b) => {
      const result = sortValue(a, sortField).localeCompare(
        sortValue(b, sortField),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        }
      );

      return sortDirection === "asc" ? result : -result;
    });
  }, [expenses, query, sortDirection, sortField]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredExpenses.length / PAGE_SIZE)
  );
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageExpenses = filteredExpenses.slice(
    pageStart,
    pageStart + PAGE_SIZE
  );

  const rangeStart = filteredExpenses.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(
    pageStart + PAGE_SIZE,
    filteredExpenses.length
  );

  return (
    <div className="space-y-3">
      <Card
        variant="default"
        padding="sm"
        className="space-y-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] md:items-center md:gap-3 md:space-y-0"
      >
        <div
          className={cn(
            fieldStyles.base,
            "flex items-center gap-2 px-4"
          )}
        >
          <Search size={17} className="text-zinc-500" />

          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, category, note, date"
            className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none"
          />
        </div>

        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <Select
            value={sortField}
            onChange={(event) => {
              setSortField(event.target.value as SortField);
              setPage(1);
            }}
            fieldSize="md"
          >
            <option value="name">Sort by Name</option>
            <option value="category">Sort by Category</option>
            <option value="date">Sort by Date</option>
            <option value="note">Sort by Note</option>
          </Select>

          <Button
            onClick={() => {
              setSortDirection((current) =>
                current === "asc" ? "desc" : "asc"
              );
              setPage(1);
            }}
            title="Toggle sort direction"
            aria-label="Toggle sort direction"
            variant="outline"
            size="iconLg"
          >
            {sortDirection === "asc" ? (
              <ArrowUpAZ size={18} />
            ) : (
              <ArrowDownAZ size={18} />
            )}
          </Button>

          <ActionIconButton
            kind="delete"
            onClick={() => {
              if (confirmDelete("Delete all expenses for this month?")) {
                deleteMonthExpenses(selectedMonth);
              }
            }}
            title="Delete current month expenses"
            aria-label="Delete current month expenses"
          />
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3 px-1 text-xs text-zinc-500">
        <span>
          {rangeStart}-{rangeEnd} of {filteredExpenses.length}
        </span>

        <span>10 records per page</span>
      </div>

      {loading && (
        <div className={cn(emptyStateStyles, "text-zinc-400")}>
          Loading...
        </div>
      )}

      {!loading && expenses.length === 0 && (
        <div className={emptyStateStyles}>
          <h3 className="mb-2 text-xl font-bold">No expenses yet</h3>

          <p className="text-sm text-zinc-400">
            Use Add Expense to start.
          </p>
        </div>
      )}

      {!loading &&
        expenses.length > 0 &&
        filteredExpenses.length === 0 && (
          <div className={emptyStateStyles}>
            <h3 className="mb-2 text-xl font-bold">No matching records</h3>

            <p className="text-sm text-zinc-400">
              Try another keyword.
            </p>
          </div>
        )}

      {!loading && pageExpenses.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {pageExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              startEdit={startEdit}
              deleteExpense={deleteExpense}
            />
          ))}
        </div>
      )}

      {!loading && filteredExpenses.length > 0 && (
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 pt-1">
          <Button
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            title="Previous page"
            aria-label="Previous page"
            variant="outline"
            size="iconLg"
          >
            <ChevronLeft size={18} />
          </Button>

          <p className="text-center text-sm text-zinc-400">
            Page {safePage} / {totalPages}
          </p>

          <Button
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            title="Next page"
            aria-label="Next page"
            variant="outline"
            size="iconLg"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      )}
    </div>
  );
}
