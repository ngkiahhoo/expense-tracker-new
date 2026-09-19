"use client";

import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import IncomeCard from "./IncomeCard";
import ListToolbar, { defaultListFilters } from "./ui/ListToolbar";
import LoadState from "./ui/LoadState";
import useSessionState from "@/hooks/useSessionState";
import { SheetFooter } from "./QuickActionSheet";
import type { Currency } from "../types/currency";
import { currencyLabel, normalizeCurrency } from "../utils/currency";

import type { Income } from "../types/income";

type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
};

interface IncomePanelProps {
  totalIncome: number;
  incomes: Income[];
  showIncomeList: boolean;
  setShowIncomeList: (value: boolean) => void;
  showIncomeForm: boolean;
  setShowIncomeForm: (value: boolean) => void;
  incomeAmount: string;
  setIncomeAmount: (value: string) => void;
  incomeNote: string;
  setIncomeNote: (value: string) => void;
  incomeEditingId: number | null;
  incomeDate: string;
  setIncomeDate: (value: string) => void;
  loading: boolean;
  reading: boolean;
  error: string;
  retry: () => void;
  cancelEdit: () => void;
  currency: Currency;
  addIncome: () => Promise<ActionResult | boolean>;
  startEditIncome: (income: Income) => void;
  deleteIncome: (id: number) => Promise<ActionResult | void>;
}

export default function IncomePanel({
  totalIncome,
  incomes,
  showIncomeList,
  setShowIncomeList,
  showIncomeForm,
  setShowIncomeForm,
  incomeAmount,
  setIncomeAmount,
  incomeNote,
  setIncomeNote,
  incomeEditingId,
  incomeDate, setIncomeDate, loading, reading, error, retry, cancelEdit,
  currency,
  addIncome,
  startEditIncome,
  deleteIncome,
}: IncomePanelProps) {
  const [filters, setFilters] = useSessionState(`income-list:${currency}`, defaultListFilters);
  const visible = incomes.filter(i => normalizeCurrency(i.currency) === currency && [i.note, i.income_date, String(i.amount)].join(" ").toLowerCase().includes(filters.query.trim().toLowerCase())).sort((a, b) => {
    if (filters.sort === "amount") return (Number(a.amount) - Number(b.amount)) * (filters.direction === "asc" ? 1 : -1);
    const value = (i: Income) => filters.sort === "name" ? i.note || "" : filters.sort === "amount" ? i.amount : i.income_date;
    return String(value(a)).localeCompare(String(value(b)), undefined, { numeric: true }) * (filters.direction === "asc" ? 1 : -1);
  });
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setShowIncomeList(!showIncomeList)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-2 text-zinc-400">
          <Wallet size={18} />
          Monthly Income
        </div>

        <h2 className="mt-2 break-all text-2xl font-bold text-white">
          {reading || error ? "Unavailable" : <>{currencyLabel(currency)}{" "}
          {totalIncome.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</>}
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          {showIncomeList ? "Showing income entries" : "Tap to view income details"}
        </p>
      </button>

      {showIncomeList && (
        <div className="mt-5 grid gap-3">
          <ListToolbar value={filters} onChange={setFilters} sorts={[{ value: "date", label: "Date" }, { value: "name", label: "Name" }, { value: "amount", label: "Amount" }]} />
          <LoadState loading={reading} error={error} retry={retry} />
          {!reading && !error && (visible.length > 0 ? (
            visible.map((income) => (
              <IncomeCard
                key={income.id}
                income={income}
                startEditIncome={startEditIncome}
                deleteIncome={deleteIncome}
              />
            ))
          ) : (
            <div className="col-span-full text-sm text-zinc-400">
              No matching income records.
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        onClick={() => setShowIncomeForm(!showIncomeForm)}
        size="lg"
        className="mt-5 w-full"
      >
        {showIncomeForm ? "Hide income form" : "+ Add Income"}
      </Button>

      {showIncomeForm && (
        <fieldset disabled={loading} className="mt-5 min-w-0 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="number"
              aria-label="Income amount"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              disabled={loading}
              placeholder="Income Amount"
              value={incomeAmount}
              onChange={(event) => setIncomeAmount(event.target.value)}
            />

            <Input
              type="text"
              placeholder="Income Note"
              value={incomeNote}
              onChange={(event) => setIncomeNote(event.target.value)}
            />
          </div>
          <label className="block text-sm">Income date<Input type="date" value={incomeDate} onChange={e => setIncomeDate(e.target.value)} disabled={loading} /></label>

          <SheetFooter>
          <Button
            type="button"
            onClick={addIncome}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? "Saving..." : incomeEditingId ? "Update Income" : "Add Income"}
          </Button>
          {incomeEditingId && <Button variant="outline" disabled={loading} onClick={cancelEdit}>Cancel edit</Button>}
          </SheetFooter>
        </fieldset>
      )}
    </div>
  );
}
