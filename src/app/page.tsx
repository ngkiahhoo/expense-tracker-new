"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import {
  Plus,
  Trash2,
  Pencil,
  FolderCog,
  CalendarDays,
} from "lucide-react";

export default function Home() {
  const [expenses, setExpenses] =
    useState<any[]>([]);

  const [categories, setCategories] =
    useState<any[]>([]);

  const [amount, setAmount] =
    useState("");

  const [note, setNote] =
    useState("");

  const [expenseDate, setExpenseDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [selectedCategory, setSelectedCategory] =
    useState("");

  const currentMonth =
    `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const typeLabels: any = {
    1: "Needs",
    2: "Wants",
    3: "Savings",
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, []);

  async function fetchExpenses() {
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        id,
        amount,
        note,
        expense_date,
        category_id,
        categories (
          id,
          name,
          type_id
        )
      `)
      .order("expense_date", {
        ascending: false,
      });

    if (error) {
      console.log(error);
      return;
    }

    if (data) {
      setExpenses(data);
    }
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from("categories")
      .select(`
        id,
        name,
        type_id
      `)
      .order("name");

    if (data) {
      setCategories(data);
    }
  }

  async function saveExpense() {
    if (
      !amount ||
      !note ||
      !selectedCategory
    )
      return;

    if (editingId) {
      await supabase
        .from("expenses")
        .update({
          amount: Number(amount),
          note,
          expense_date: expenseDate,
          category_id:
            Number(selectedCategory),
        })
        .eq("id", editingId);
    } else {
      await supabase
        .from("expenses")
        .insert({
          amount: Number(amount),
          note,
          expense_date: expenseDate,
          category_id:
            Number(selectedCategory),
        });
    }

    resetForm();

    fetchExpenses();
  }

  async function deleteExpense(id: number) {
    await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    fetchExpenses();
  }

  function startEdit(expense: any) {
    setEditingId(expense.id);

    setAmount(
      expense.amount.toString()
    );

    setNote(expense.note);

    setExpenseDate(
      expense.expense_date
    );

    setSelectedCategory(
      expense.category_id?.toString() || ""
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setEditingId(null);

    setAmount("");

    setNote("");

    setSelectedCategory("");

    setExpenseDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );
  }

  const availableMonths =
    [
      ...new Set(
        expenses.map((e) =>
          e.expense_date?.slice(0, 7)
        )
      ),
    ];

  const filteredExpenses =
    useMemo(() => {
      return expenses.filter((expense) =>
        expense.expense_date?.startsWith(
          selectedMonth
        )
      );
    }, [expenses, selectedMonth]);

  const total =
    filteredExpenses.reduce(
      (sum, item) =>
        sum + item.amount,
      0
    );

  return (
    <main className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-md mx-auto px-4 pt-6">

        {/* HEADER */}
        <div className="flex justify-between items-start mb-5">

          <div>
            <h1 className="text-4xl font-bold">
              Expense Tracker
            </h1>

            <p className="text-gray-400 mt-1">
              Monthly finance tracking
            </p>
          </div>

          <a
            href="/categories"
            className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl"
          >
            <FolderCog size={22} />
          </a>

        </div>

        {/* MONTH SELECT */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 mb-5">

          <p className="text-sm text-gray-400 mb-2">
            Viewing Month
          </p>

          <select
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(
                e.target.value
              )
            }
            className="w-full bg-black border border-zinc-800 rounded-2xl p-4"
          >
            {availableMonths.map(
              (month) => (
                <option
                  key={month}
                  value={month}
                >
                  {month === currentMonth
                    ? `${month} (Current)`
                    : month}
                </option>
              )
            )}
          </select>

        </div>

        {/* TOTAL */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-5">

          <p className="text-gray-400 mb-2">
            Total Spending
          </p>

          <h2 className="text-5xl font-bold">
            RM {total.toFixed(2)}
          </h2>

        </div>

        {/* FORM */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 mb-5 space-y-3">

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
            className="w-full bg-black border border-zinc-800 rounded-2xl p-4"
          />

          <input
            type="text"
            placeholder="Note"
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            className="w-full bg-black border border-zinc-800 rounded-2xl p-4"
          />

          {/* DATE */}
          <div className="relative">
            <input
              type="date"
              value={expenseDate}
              onChange={(e) =>
                setExpenseDate(e.target.value)
              }
              className="
                w-full
                bg-zinc-950
                border
                border-zinc-800
                rounded-2xl
                px-4
                py-4
                text-white
                outline-none
              " 
            />
          </div>

          {/* CATEGORY */}
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(
                e.target.value
              )
            }
            className="w-full bg-black border border-zinc-800 rounded-2xl p-4"
          >
            <option value="">
              Select Category
            </option>

            {categories.map((cat) => (
              <option
                key={cat.id}
                value={cat.id}
              >
                {cat.name} (
                {
                  typeLabels[
                    cat.type_id
                  ]
                }
                )
              </option>
            ))}
          </select>

          {/* BUTTONS */}
          <div className="flex gap-3">

            <button
              onClick={saveExpense}
              className="flex-1 bg-white text-black rounded-2xl p-4 font-bold flex items-center justify-center gap-2"
            >
              <Plus size={18} />

              {editingId
                ? "Update Expense"
                : "Add Expense"}
            </button>

            {editingId && (
              <button
                onClick={resetForm}
                className="bg-zinc-700 rounded-2xl px-5"
              >
                Cancel
              </button>
            )}

          </div>

        </div>

        {/* LIST */}
        <div className="space-y-3">

          {filteredExpenses.map(
            (expense: any) => (
              <div
                key={expense.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
              >

                <div className="flex justify-between">

                  <div>

                    <p className="font-medium text-lg">
                      {expense.note}
                    </p>

                    <p className="text-sm text-gray-400 mt-1">
                      {
                        expense.categories
                          ?.name
                      }
                    </p>

                    <p className="text-xs text-gray-500">
                      {
                        typeLabels[
                          expense
                            .categories
                            ?.type_id
                        ]
                      }
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      {
                        expense.expense_date
                      }
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="font-bold text-xl">
                      RM {expense.amount}
                    </p>

                    <div className="flex gap-2 mt-3 justify-end">

                      <button
                        onClick={() =>
                          startEdit(
                            expense
                          )
                        }
                        className="bg-blue-500 p-2 rounded-xl"
                      >
                        <Pencil
                          size={16}
                        />
                      </button>

                      <button
                        onClick={() =>
                          deleteExpense(
                            expense.id
                          )
                        }
                        className="bg-red-500 p-2 rounded-xl"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>

                    </div>

                  </div>

                </div>

              </div>
            )
          )}

        </div>

      </div>
    </main>
  );
}