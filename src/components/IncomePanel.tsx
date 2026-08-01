"use client";

import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import IncomeCard from "./IncomeCard";
import type { Currency } from "../types/currency";
import { currencyLabel } from "../utils/currency";

import type { Income } from "../types/income";

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
  currency: Currency;
  addIncome: () => Promise<any>;
  startEditIncome: (income: Income) => void;
  deleteIncome: (id: number) => Promise<any>;
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
  currency,
  addIncome,
  startEditIncome,
  deleteIncome,
}: IncomePanelProps) {
  return (
    <Card variant="item" padding="lg" className="mb-5">
      <button
        type="button"
        onClick={() => setShowIncomeList(!showIncomeList)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-2 text-zinc-400">
          <Wallet size={18} />
          Monthly Income
        </div>

        <h2 className="mt-2 text-5xl font-bold tracking-tight text-white">
          {currencyLabel(currency)}{" "}
          {totalIncome.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          {showIncomeList ? "Showing income entries" : "Tap to view income details"}
        </p>
      </button>

      {showIncomeList && (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {incomes.length > 0 ? (
            incomes.map((income) => (
              <IncomeCard
                key={income.id}
                income={income}
                startEditIncome={startEditIncome}
                deleteIncome={deleteIncome}
              />
            ))
          ) : (
            <div className="col-span-full text-sm text-zinc-400">
              No income records yet.
            </div>
          )}
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
        <div className="mt-5 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="number"
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

          <Button
            type="button"
            onClick={addIncome}
            size="lg"
            className="w-full"
          >
            {incomeEditingId ? "Update Income" : "Add Income"}
          </Button>
        </div>
      )}
    </Card>
  );
}
