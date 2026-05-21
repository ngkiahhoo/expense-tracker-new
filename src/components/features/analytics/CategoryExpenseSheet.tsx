"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Expense } from "../../../types/expense";
import { getExpensesByCategory } from "../../../services/expenseService";

interface CategoryExpenseSheetProps {
  isOpen: boolean;
  categoryId: number | null;
  categoryName: string;
  categoryTotal: number;
  categoryPercent: number;
  selectedMonth: string;
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
  onClose,
  onEdit,
  onDelete,
}: CategoryExpenseSheetProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dialogStart = useRef({ x: 0, y: 0 });

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<'expense_date' | 'amount'>('expense_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const offset = (page - 1) * PAGE_SIZE;

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPos({ x: dialogStart.current.x + dx, y: dialogStart.current.y + dy });
    }

    function onUp() {
      dragging.current = false;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

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
        sortField === 'amount' ? 'amount' : 'expense_date',
        sortDirection
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
  }, [isOpen, categoryId, selectedMonth, query, page, sortField, sortDirection, offset]);

  useEffect(() => {
    setPage(1);
  }, [categoryId, query, sortField, sortDirection]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 sm:px-6"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        style={pos ? { position: "fixed", left: pos.x, top: pos.y } : undefined}
        className="w-full max-w-3xl overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={headerRef}
          onMouseDown={(e) => {
            const el = dialogRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            dragging.current = true;
            dragStart.current = { x: e.clientX, y: e.clientY };
            dialogStart.current = { x: rect.left, y: rect.top };
            setPos({ x: rect.left, y: rect.top });
            e.preventDefault();
          }}
          className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 p-4 cursor-grab"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Category details</p>
            <h2 className="text-xl font-bold text-white">{categoryName}</h2>
            <p className="text-sm text-zinc-400">RM {categoryTotal.toFixed(2)} · {categoryPercent}% of month spending</p>
          </div>

          <button onClick={onClose} title="Close" aria-label="Close" className="rounded-2xl bg-zinc-900 p-3 text-zinc-300 transition hover:bg-zinc-800">Close</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-3 bg-black rounded-2xl px-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, note"
                className="min-w-0 flex-1 bg-transparent py-3 outline-none text-sm text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select value={sortField} onChange={(e) => setSortField(e.target.value as any)} className="bg-zinc-900 rounded-2xl p-3 outline-none">
                <option value="expense_date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
              </select>

              <button onClick={() => setSortDirection((d) => d === 'asc' ? 'desc' : 'asc')} className="bg-zinc-900 rounded-2xl p-3">
                {sortDirection === 'asc' ? 'Asc' : 'Desc'}
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-3xl bg-zinc-900 p-4">
                    <div className="h-4 w-3/4 rounded bg-zinc-800 mb-3" />
                    <div className="h-4 w-1/2 rounded bg-zinc-800" />
                  </div>
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <p className="text-lg font-semibold text-white">No records in this category</p>
                <p className="mt-2 text-sm text-zinc-400">Add expenses in this category to see records here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-white">{expense.note || 'Expense'}</p>
                        <p className="mt-1 text-sm text-zinc-400">{expense.categories?.name || 'Uncategorized'}</p>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">RM {Number(expense.amount).toFixed(2)}</p>
                          <p className="text-sm text-zinc-500">{formatDate(expense.expense_date)}</p>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => onEdit(expense)} className="rounded-2xl bg-zinc-800 px-3 py-2 text-sm">Edit</button>
                          <button onClick={() => onDelete(expense.id)} className="rounded-2xl bg-red-600 px-3 py-2 text-sm">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">{(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}</div>

            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="bg-zinc-900 rounded-2xl p-3 disabled:opacity-40">Prev</button>
              <div className="px-3 py-2 bg-zinc-900 rounded-2xl">Page {page} / {totalPages}</div>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="bg-zinc-900 rounded-2xl p-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
