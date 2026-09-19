"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useExpenseRecords from "@/hooks/useExpenseRecords";
import useSessionState from "@/hooks/useSessionState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import ListToolbar, { defaultListFilters } from "@/components/ui/ListToolbar";
import LoadState from "@/components/ui/LoadState";
import ExpenseCard from "./ExpenseCard";
import type { Expense } from "../types/expense";
import { normalizeCurrency } from "@/utils/currency";

const PAGE_SIZE = 10;
export default function ExpenseRecordsPanel({ startEdit, deleteExpense }: { startEdit: (expense: Expense) => void; deleteExpense: (id: number) => void }) {
  const { expenses, loading, error, retry } = useExpenseRecords();
  const [filters, setFilters] = useSessionState("records:filters", defaultListFilters);
  const [dateFrom, setDateFrom] = useSessionState("records:from", "");
  const [dateTo, setDateTo] = useSessionState("records:to", "");
  const [page, setPage] = useSessionState("records:page", 1);
  const invalidRange = !!dateFrom && !!dateTo && dateFrom > dateTo;
  const matched = expenses.filter(e => !invalidRange && (!dateFrom || e.expense_date >= dateFrom) && (!dateTo || e.expense_date <= dateTo) &&
    (filters.currency === "all" || normalizeCurrency(e.currency) === filters.currency) &&
    [e.note, e.categories?.name, e.categories?.types?.name, e.expense_date, String(e.amount)].join(" ").toLowerCase().includes(filters.query.trim().toLowerCase()));
  matched.sort((a, b) => {
    if (filters.sort === "amount") return (Number(a.amount) - Number(b.amount)) * (filters.direction === "asc" ? 1 : -1) || b.id - a.id;
    const value = (e: Expense) => filters.sort === "date" ? e.expense_date : filters.sort === "amount" ? e.amount : filters.sort === "category" ? e.categories?.name ?? "" : e.note || e.categories?.name || "";
    return String(value(a)).localeCompare(String(value(b)), undefined, { numeric: true }) * (filters.direction === "asc" ? 1 : -1) || b.id - a.id;
  });
  const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const visible = matched.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  return <div className="space-y-3">
    <ListToolbar value={filters} onChange={next => { setFilters(next); setPage(1); }} onClear={() => { setDateFrom(""); setDateTo(""); }} currencies={["MYR", "SGD"]} sorts={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }, { value: "amount", label: "Amount" }, { value: "category", label: "Category" }]} />
    <div className="grid grid-cols-2 gap-2"><label className="min-w-0 text-sm">From date<Input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => { setDateFrom(e.target.value); setPage(1); }} /></label><label className="min-w-0 text-sm">To date<Input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => { setDateTo(e.target.value); setPage(1); }} /></label></div>
    {(dateFrom || dateTo) && <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}>All dates</Button>}
    {invalidRange && <p role="alert" className="text-sm text-rose-400">From date must be on or before To date.</p>}
    <LoadState loading={loading} error={error} retry={retry} />
    {!loading && !error && <>
      <p className="text-xs text-zinc-400">{matched.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(safePage * PAGE_SIZE, matched.length)} of {matched.length}</p>
      {!visible.length && <p className="py-6 text-sm text-zinc-400">{expenses.length ? "No matching records." : "No expenses yet."}</p>}
      <div className="grid gap-3 md:grid-cols-2">{visible.map(expense => <ExpenseCard key={expense.id} expense={expense} startEdit={startEdit} deleteExpense={deleteExpense} />)}</div>
      {totalPages > 1 && <div className="flex items-center justify-between gap-3"><Button size="iconLg" variant="outline" aria-label="Previous page" title="Previous page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><ChevronLeft size={18} /></Button><span className="text-sm">Page {safePage} / {totalPages}</span><Button size="iconLg" variant="outline" aria-label="Next page" title="Next page" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}><ChevronRight size={18} /></Button></div>}
    </>}
  </div>;
}
