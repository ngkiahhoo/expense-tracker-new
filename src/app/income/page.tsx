"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
} from "lucide-react";
import ActionIconButton from "@/components/ui/ActionIconButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { supabase } from "../../lib/supabase";
import type { Currency } from "../../types/currency";
import type { Income } from "../../types/income";
import {
  CURRENCIES,
  currencyLabel,
  formatCurrencyAmount,
  getStoredCurrency,
  normalizeCurrency,
} from "../../utils/currency";

export default function IncomePage() {
  const currentMonth = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [incomeDate, setIncomeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [activeCurrency, setActiveCurrency] = useState<Currency>(() => getStoredCurrency());

  useEffect(() => {
    fetchIncome();
  }, [selectedMonth]);

  function handleCurrencyChange(value: string) {
    const nextCurrency: Currency = value === "SGD" ? "SGD" : "MYR";
    setActiveCurrency(nextCurrency);
    window.localStorage.setItem("expense-tracker-currency", nextCurrency);
  }

  async function fetchIncome() {
    const [year, month] = selectedMonth.split("-").map(Number);
    const start = `${selectedMonth}-01`;
    const end = `${selectedMonth}-${String(
      new Date(year, month, 0).getDate()
    ).padStart(2, "0")}`;

    const { data } = await supabase
      .from("incomes")
      .select("*")
      .gte("income_date", start)
      .lte("income_date", end)
      .order("income_date", {
        ascending: false,
      });

    if (data) {
      setIncomes(data as Income[]);
    }
  }

  async function saveIncome() {
    if (!amount) return;

    if (editingId) {
      await supabase
        .from("incomes")
        .update({
          amount: Number(amount),
          currency: editingCurrency || activeCurrency,
          note,
          income_date: incomeDate,
        })
        .eq("id", editingId);
    } else {
      await supabase.from("incomes").insert([
        {
          amount: Number(amount),
          currency: activeCurrency,
          note,
          income_date: incomeDate,
        },
      ]);
    }

    resetForm();
    fetchIncome();
  }

  async function deleteIncome(id: number) {
    await supabase.from("incomes").delete().eq("id", id);
    fetchIncome();
  }

  function startEdit(income: Income) {
    setEditingId(income.id);
    setAmount(income.amount.toString());
    setNote(income.note || "");
    setIncomeDate(income.income_date);
    setEditingCurrency(normalizeCurrency(income.currency));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setEditingId(null);
    setAmount("");
    setNote("");
    setIncomeDate(new Date().toISOString().split("T")[0]);
    setEditingCurrency(null);
  }

  const totalIncome = useMemo(() => {
    return incomes
      .filter((item) => normalizeCurrency(item.currency) === activeCurrency)
      .reduce((sum, item) => sum + Number(item.amount), 0);
  }, [incomes, activeCurrency]);

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto grid max-w-md gap-5">
        <div>
          <h1 className="mb-2 text-5xl font-bold">Income</h1>
          <p className="text-zinc-400">Monthly income tracking</p>
        </div>

        <Select
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
        >
          <option value={currentMonth}>Current Month</option>
          <option value="2026-04">2026-04</option>
          <option value="2026-03">2026-03</option>
        </Select>

        <Select
          value={activeCurrency}
          onChange={(event) => handleCurrencyChange(event.target.value)}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currencyLabel(currency)}
            </option>
          ))}
        </Select>

        <Card variant="success" padding="lg">
          <div className="mb-2 flex items-center gap-2">
            <Wallet size={18} />
            <p className="text-zinc-400">Total Income</p>
          </div>

          <h2 className="text-5xl font-bold">
            {formatCurrencyAmount(totalIncome, activeCurrency)}
          </h2>
        </Card>

        <Card variant="default" padding="md" className="space-y-3">
          <Input
            type="number"
            placeholder="Income Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />

          <Input
            type="text"
            placeholder="Income Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <Input
            type="date"
            value={incomeDate}
            onChange={(event) => setIncomeDate(event.target.value)}
          />

          <div className="flex gap-3">
            <Button onClick={saveIncome} size="lg" className="flex-1">
              {editingId ? "Update Income" : "Add Income"}
            </Button>

            {editingId && (
              <ActionIconButton
                kind="close"
                onClick={resetForm}
                title="Cancel edit"
                aria-label="Cancel edit"
              />
            )}
          </div>
        </Card>

        <div className="space-y-3">
          {incomes.map((income) => (
            <Card
              key={income.id}
              variant="default"
              padding="md"
              className="flex justify-between gap-4"
            >
              <div>
                <p className="text-lg font-bold">
                  {income.note || "Income"}
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                  {income.income_date}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="mb-3 text-3xl font-bold">
                  {formatCurrencyAmount(Number(income.amount), income.currency)}
                </p>

                <div className="flex justify-end gap-2">
                  <ActionIconButton
                    kind="edit"
                    onClick={() => startEdit(income)}
                    title="Edit income"
                    aria-label="Edit income"
                  />

                  <ActionIconButton
                    kind="delete"
                    onClick={() => deleteIncome(income.id)}
                    title="Delete income"
                    aria-label="Delete income"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
