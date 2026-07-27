"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  X,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { supabase } from "../../lib/supabase";

export default function IncomePage() {
  const currentMonth = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  const [incomes, setIncomes] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [incomeDate, setIncomeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  useEffect(() => {
    fetchIncome();
  }, [selectedMonth]);

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
      setIncomes(data);
    }
  }

  async function saveIncome() {
    if (!amount) return;

    if (editingId) {
      await supabase
        .from("incomes")
        .update({
          amount: Number(amount),
          note,
          income_date: incomeDate,
        })
        .eq("id", editingId);
    } else {
      await supabase.from("incomes").insert([
        {
          amount: Number(amount),
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

  function startEdit(income: any) {
    setEditingId(income.id);
    setAmount(income.amount.toString());
    setNote(income.note || "");
    setIncomeDate(income.income_date);

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
  }

  const totalIncome = useMemo(() => {
    return incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  }, [incomes]);

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

        <Card variant="success" padding="lg">
          <div className="mb-2 flex items-center gap-2">
            <Wallet size={18} />
            <p className="text-zinc-400">Total Income</p>
          </div>

          <h2 className="text-5xl font-bold">
            RM {totalIncome.toFixed(2)}
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
              <Button
                onClick={resetForm}
                variant="subtle"
                size="iconLg"
                title="Cancel edit"
                aria-label="Cancel edit"
              >
                <X size={18} />
              </Button>
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
                  RM {income.amount}
                </p>

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => startEdit(income)}
                    variant="subtle"
                    size="iconLg"
                    title="Edit income"
                    aria-label="Edit income"
                  >
                    <Pencil size={16} />
                  </Button>

                  <Button
                    onClick={() => deleteIncome(income.id)}
                    variant="danger"
                    size="iconLg"
                    title="Delete income"
                    aria-label="Delete income"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}

