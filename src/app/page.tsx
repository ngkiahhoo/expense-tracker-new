"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default async function Home() {
  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  const total =
    expenses?.reduce((sum, item) => sum + item.amount, 0) || 0;

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-5xl font-bold mb-2">
          Expense Tracker
        </h1>

        <p className="text-gray-400 mb-8">
          Calm personal finance tracking
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-6">
          <p className="text-gray-400 mb-2">Total Spending</p>

          <h2 className="text-5xl font-bold">
            RM {total.toFixed(2)}
          </h2>
        </div>

        <div className="space-y-3">
          {expenses?.map((expense) => (
            <div
              key={expense.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
            >
              <div className="flex justify-between">
                <p>{expense.note}</p>

                <p className="font-bold">
                  RM {expense.amount}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}