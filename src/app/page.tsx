"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [expenses, setExpenses] = useState<any[]>([]);

  async function loadExpenses() {

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setExpenses(data);
    }

  }

  useEffect(() => {
    loadExpenses();
  }, []);

  async function addExpense() {

    if (!amount) return;

    await supabase
      .from("expenses")
      .insert([
        {
          amount: Number(amount),
          note
        }
      ]);

    setAmount("");
    setNote("");

    loadExpenses();
  }

  const total = expenses.reduce(
    (sum, e) => sum + e.amount,
    0
  );

  return (

    <main className="min-h-screen bg-[#0f1115] text-white">

      <div className="max-w-md mx-auto px-5 py-8">

        {/* Header */}
        <div className="mb-8">

          <h1 className="text-4xl font-bold tracking-tight">
            Expense Tracker
          </h1>

          <p className="text-zinc-400 mt-2">
            Calm personal finance tracking
          </p>

        </div>

        {/* Summary Card */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6 backdrop-blur">

          <p className="text-zinc-400 text-sm mb-2">
            Total Spending
          </p>

          <h2 className="text-4xl font-bold">
            RM {total.toFixed(2)}
          </h2>

        </div>

        {/* Add Expense */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-6 space-y-4">

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            className="
              w-full
              bg-[#181b22]
              rounded-2xl
              px-4
              py-4
              text-2xl
              outline-none
              border border-white/5
              focus:border-white/20
            "
          />

          <input
            type="text"
            placeholder="Note"
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            className="
              w-full
              bg-[#181b22]
              rounded-2xl
              px-4
              py-4
              outline-none
              border border-white/5
              focus:border-white/20
            "
          />

          <button
            onClick={addExpense}
            className="
              w-full
              bg-white
              text-black
              rounded-2xl
              py-4
              font-semibold
              hover:opacity-90
              transition
            "
          >
            Save Expense
          </button>

        </div>

        {/* Expense List */}
        <div className="space-y-3">

          {expenses.map((e) => (

            <div
              key={e.id}
              className="
                bg-white/5
                border border-white/10
                rounded-2xl
                p-4
              "
            >

              <div className="flex justify-between items-start">

                <div>

                  <p className="text-lg font-medium">
                    {e.note || "Untitled"}
                  </p>

                  <p className="text-zinc-500 text-sm mt-1">
                    {new Date(
                      e.created_at
                    ).toLocaleString()}
                  </p>

                </div>

                <div className="text-xl font-bold">
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