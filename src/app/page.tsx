"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [expenses, setExpenses] = useState<any[]>([]);

  async function loadExpenses() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setExpenses(data);
    }
  }

  async function addExpense() {
    if (!amount) return;

    await supabase.from("expenses").insert([
      {
        amount: Number(amount),
        note: note,
      },
    ]);

    setAmount("");
    setNote("");

    loadExpenses();
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  const total = expenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );

  return (
    <main className="min-h-screen bg-[#f5f7f2] text-[#1f2937] p-5">
      <div className="max-w-md mx-auto">

        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">
            Expense Tracker
          </h1>

          <p className="text-gray-500">
            Calm personal finance tracking
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm mb-5">
          <div className="text-sm text-gray-500 mb-1">
            Total Spending
          </div>

          <div className="text-4xl font-bold">
            RM {total.toFixed(2)}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm mb-5">

          <input
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            placeholder="Amount"
            type="number"
            className="w-full h-12 rounded-2xl bg-gray-100 px-4 mb-3 outline-none"
          />

          <input
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            placeholder="Note"
            className="w-full h-12 rounded-2xl bg-gray-100 px-4 mb-3 outline-none"
          />

          <button
            onClick={addExpense}
            className="w-full h-12 rounded-2xl bg-[#6b8f71] text-white font-semibold"
          >
            Save Expense
          </button>

        </div>

        <div className="space-y-3">
          {expenses.map((e) => (
            <div
              key={e.id}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <div className="flex justify-between items-center">

                <div>
                  <div className="font-semibold">
                    {e.note || "Expense"}
                  </div>

                  <div className="text-sm text-gray-400">
                    {new Date(
                      e.created_at
                    ).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-lg font-bold">
                  RM {e.amount}
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}