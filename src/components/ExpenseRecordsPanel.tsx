"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import ExpenseCard
from "./ExpenseCard";

import type {
  Expense,
} from "../types/expense";

type SortField =
  | "name"
  | "category"
  | "date"
  | "note";

type SortDirection =
  | "asc"
  | "desc";

interface ExpenseRecordsPanelProps {
  expenses: Expense[];
  loading: boolean;
  startEdit: (expense: Expense) => void;
  deleteExpense: (id: number) => void;
}

const PAGE_SIZE = 10;

function expenseName(
  expense: Expense
) {
  return (
    expense.note ||
    expense.categories?.name ||
    "Expense"
  );
}

function sortValue(
  expense: Expense,
  field: SortField
) {
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

function searchHaystack(
  expense: Expense
) {
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
}: ExpenseRecordsPanelProps) {
  const [query, setQuery] =
    useState("");

  const [sortField, setSortField] =
    useState<SortField>("date");

  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  const [page, setPage] =
    useState(1);

  const filteredExpenses =
    useMemo(() => {
      const normalizedQuery =
        query.trim().toLowerCase();

      const matched =
        normalizedQuery
          ? expenses.filter((expense) =>
              searchHaystack(expense).includes(
                normalizedQuery
              )
            )
          : expenses;

      return [...matched].sort((a, b) => {
        const left =
          sortValue(a, sortField);

        const right =
          sortValue(b, sortField);

        const result =
          left.localeCompare(
            right,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          );

        return sortDirection === "asc"
          ? result
          : -result;
      });
    }, [
      expenses,
      query,
      sortDirection,
      sortField,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredExpenses.length /
          PAGE_SIZE
      )
    );

  useEffect(() => {
    setPage(1);
  }, [
    query,
    sortDirection,
    sortField,
  ]);

  useEffect(() => {
    setPage((current) =>
      Math.min(current, totalPages)
    );
  }, [totalPages]);

  const pageStart =
    (page - 1) * PAGE_SIZE;

  const pageExpenses =
    filteredExpenses.slice(
      pageStart,
      pageStart + PAGE_SIZE
    );

  const rangeStart =
    filteredExpenses.length === 0
      ? 0
      : pageStart + 1;

  const rangeEnd =
    Math.min(
      pageStart + PAGE_SIZE,
      filteredExpenses.length
    );

  return (
    <div className="space-y-3">

      <div
        className="
          bg-zinc-900
          border
          border-zinc-800
          rounded-2xl
          p-3
          space-y-3
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
            bg-black
            rounded-2xl
            px-4
          "
        >
          <Search
            size={17}
            className="text-zinc-500"
          />

          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Search name, category, note, date"
            className="
              min-w-0
              flex-1
              bg-transparent
              py-4
              outline-none
              text-sm
            "
          />
        </div>

        <div
          className="
            grid
            grid-cols-[1fr_auto]
            gap-2
          "
        >
          <select
            value={sortField}
            onChange={(event) =>
              setSortField(
                event.target.value as SortField
              )
            }
            className="
              min-w-0
              bg-black
              rounded-2xl
              p-4
              outline-none
              text-sm
            "
          >
            <option value="name">
              Sort by Name
            </option>
            <option value="category">
              Sort by Category
            </option>
            <option value="date">
              Sort by Date
            </option>
            <option value="note">
              Sort by Note
            </option>
          </select>

          <button
            onClick={() =>
              setSortDirection((current) =>
                current === "asc"
                  ? "desc"
                  : "asc"
              )
            }
            title="Toggle sort direction"
            aria-label="Toggle sort direction"
            className="
              bg-black
              rounded-2xl
              px-4
            "
          >
            {sortDirection === "asc"
              ? <ArrowUpAZ size={18}/>
              : <ArrowDownAZ size={18}/>}
          </button>
        </div>
      </div>

      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          px-1
          text-xs
          text-zinc-500
        "
      >
        <span>
          {rangeStart}-{rangeEnd} of {filteredExpenses.length}
        </span>

        <span>
          10 records per page
        </span>
      </div>

      {loading && (
        <div
          className="
            bg-zinc-900
            rounded-2xl
            p-8
            text-center
            text-zinc-400
          "
        >
          Loading...
        </div>
      )}

      {!loading &&
        expenses.length === 0 && (
          <div
            className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              p-8
              text-center
            "
          >
            <h3
              className="
                text-xl
                font-bold
                mb-2
              "
            >
              No expenses yet
            </h3>

            <p
              className="
                text-zinc-400
                text-sm
              "
            >
              Use Add Expense to start.
            </p>
          </div>
        )}

      {!loading &&
        expenses.length > 0 &&
        filteredExpenses.length === 0 && (
          <div
            className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-2xl
              p-8
              text-center
            "
          >
            <h3
              className="
                text-xl
                font-bold
                mb-2
              "
            >
              No matching records
            </h3>

            <p
              className="
                text-zinc-400
                text-sm
              "
            >
              Try another keyword.
            </p>
          </div>
        )}

      {!loading &&
        pageExpenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            startEdit={startEdit}
            deleteExpense={deleteExpense}
          />
        ))}

      {!loading &&
        filteredExpenses.length > 0 && (
          <div
            className="
              grid
              grid-cols-[auto_1fr_auto]
              items-center
              gap-3
              pt-1
            "
          >
            <button
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
              disabled={page <= 1}
              title="Previous page"
              aria-label="Previous page"
              className="
                bg-zinc-900
                border
                border-zinc-800
                rounded-2xl
                p-3
                disabled:opacity-40
              "
            >
              <ChevronLeft size={18}/>
            </button>

            <p
              className="
                text-center
                text-sm
                text-zinc-400
              "
            >
              Page {page} / {totalPages}
            </p>

            <button
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    totalPages,
                    current + 1
                  )
                )
              }
              disabled={page >= totalPages}
              title="Next page"
              aria-label="Next page"
              className="
                bg-zinc-900
                border
                border-zinc-800
                rounded-2xl
                p-3
                disabled:opacity-40
              "
            >
              <ChevronRight size={18}/>
            </button>
          </div>
        )}

    </div>
  );
}
