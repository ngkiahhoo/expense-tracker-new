"use client";

import { Wallet } from "lucide-react";
import IncomeCard from "./IncomeCard";
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
  addIncome,
  startEditIncome,
  deleteIncome,
}: IncomePanelProps) {
  return (
    <div className="bg-zinc-900 border-2 border-zinc-700 rounded-3xl p-5 mb-5 sm:p-6">
      <button
        type="button"
        onClick={() => setShowIncomeList(!showIncomeList)}
        className="w-full flex justify-between items-center"
      >
        <div>
          <div className="flex items-center gap-2 text-zinc-400">
            <Wallet size={18} />
            Monthly Income
          </div>

          <h2 className="text-5xl font-bold mt-2 tracking-tight text-white">
            RM {totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>

          <p className="text-zinc-400 text-sm mt-2">
            {showIncomeList ? "Showing income entries" : "Tap to view income details"}
          </p>
        </div>
      </button>

      {showIncomeList && (
        <div className="grid gap-3 mt-5 md:grid-cols-2">
          {incomes.length > 0 ? (
            incomes.map((income) => (
              <IncomeCard key={income.id} income={income} startEditIncome={startEditIncome} deleteIncome={deleteIncome} />
            ))
          ) : (
            <div className="text-zinc-400 text-sm col-span-full">No income records yet.</div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowIncomeForm(!showIncomeForm)}
        className="w-full bg-white text-black rounded-2xl p-4 mb-5 font-bold hover:opacity-90 transition-opacity"
      >
        {showIncomeForm ? "Hide income form" : "+ Add Income"}
      </button>

      {showIncomeForm && (
        <div className="bg-zinc-900 border-2 border-zinc-700 rounded-3xl p-5 mb-5 space-y-3 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="number"
              placeholder="Income Amount"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
              className="w-full min-w-0 bg-black rounded-2xl p-4"
            />

            <input
              type="text"
              placeholder="Income Note"
              value={incomeNote}
              onChange={(e) => setIncomeNote(e.target.value)}
              className="w-full min-w-0 bg-black rounded-2xl p-4"
            />
          </div>

          <button type="button" onClick={addIncome} className="w-full bg-white text-black rounded-2xl p-4 font-bold">
            {incomeEditingId ? "Update Income" : "Add Income"}
          </button>
        </div>
      )}
    </div>
  );
}
