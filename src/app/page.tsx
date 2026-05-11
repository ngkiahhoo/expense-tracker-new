"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import {
  Plus,
  Trash2,
  Pencil,
  X,
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

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  useEffect(() => {
    fetchExpenses();

    fetchCategories();
  }, []);

  async function fetchExpenses() {
    const { data, error } =
      await supabase
        .from("expenses")
        .select(`
          *,
          categories (
            name,
            types (
              name
            )
          )
        `)
        .order("id", {
          ascending: false,
        });

    if (!error && data) {
      setExpenses(data);
    }
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from("categories")
      .select(`
        *,
        types (
          name
        )
      `);

    if (data) {
      setCategories(data);
    }
  }

  async function addExpense() {
    if (
      !amount ||
      !note ||
      !selectedCategory
    )
      return;

    const { error } = await supabase
      .from("expenses")
      .insert([
        {
          amount: Number(amount),
          note,
          category_id:
            Number(selectedCategory),
        },
      ]);

    if (!error) {
      resetForm();

      fetchExpenses();
    }
  }

  async function updateExpense() {
    if (!editingId) return;

    const { error } = await supabase
      .from("expenses")
      .update({
        amount: Number(amount),
        note,
        category_id:
          Number(selectedCategory),
      })
      .eq("id", editingId);

    if (!error) {
      resetForm();

      fetchExpenses();
    }
  }

  async function deleteExpense(
    id: number
  ) {
    await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    fetchExpenses();
  }

  function resetForm() {
    setAmount("");

    setNote("");

    setSelectedCategory("");

    setEditingId(null);

    setShowModal(false);
  }

  const total = expenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-5xl font-bold mb-2">
          Expense Tracker
        </h1>

        <p className="text-gray-400 mb-6">
          Calm personal finance tracking
        </p>

        {/* TOTAL CARD */}

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-5">
          <p className="text-gray-400 mb-2">
            Total Spending
          </p>

          <h2 className="text-5xl font-bold">
            RM {total.toFixed(2)}
          </h2>
        </div>

        {/* EXPENSE LIST */}

        <div className="space-y-3">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="
                bg-zinc-900
                border
                border-zinc-800
                rounded-2xl
                p-4
              "
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {expense.note}
                  </p>

                  <div className="text-sm text-gray-400 mt-1">
                    <p>
                      RM {expense.amount}
                    </p>

                    <p>
                      {
                        expense
                          .categories?.types
                          ?.name
                      }
                      {" • "}
                      {
                        expense
                          .categories?.name
                      }
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingId(
                        expense.id
                      );

                      setAmount(
                        expense.amount.toString()
                      );

                      setNote(
                        expense.note
                      );

                      setSelectedCategory(
                        expense.category_id?.toString()
                      );

                      setShowModal(true);
                    }}
                    className="text-blue-400"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    onClick={() =>
                      deleteExpense(
                        expense.id
                      )
                    }
                    className="text-red-400"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FLOATING BUTTON */}

        <button
          onClick={() =>
            setShowModal(true)
          }
          className="
            fixed
            bottom-6
            right-6
            bg-white
            text-black
            w-14
            h-14
            rounded-full
            flex
            items-center
            justify-center
            shadow-xl
          "
        >
          <Plus size={28} />
        </button>

        {/* MODAL */}

        {showModal && (
          <div
            className="
              fixed
              inset-0
              bg-black/70
              flex
              items-end
              justify-center
              z-50
            "
          >
            <div
              className="
                bg-zinc-950
                border
                border-zinc-800
                rounded-t-3xl
                p-5
                w-full
                max-w-md
              "
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold">
                  {editingId
                    ? "Edit Expense"
                    : "Add Expense"}
                </h2>

                <button
                  onClick={resetForm}
                >
                  <X size={22} />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  className="
                    w-full
                    bg-black
                    border
                    border-zinc-800
                    rounded-2xl
                    p-4
                    text-xl
                  "
                />

                <input
                  placeholder="Note"
                  value={note}
                  onChange={(e) =>
                    setNote(
                      e.target.value
                    )
                  }
                  className="
                    w-full
                    bg-black
                    border
                    border-zinc-800
                    rounded-2xl
                    p-4
                  "
                />

                <select
                  value={selectedCategory}
                  onChange={(e) =>
                    setSelectedCategory(
                      e.target.value
                    )
                  }
                  className="
                    w-full
                    bg-black
                    border
                    border-zinc-800
                    rounded-2xl
                    p-4
                  "
                >
                  <option value="">
                    Select Category
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category.id
                        }
                        value={
                          category.id
                        }
                      >
                        {
                          category.types
                            .name
                        }
                        {" → "}
                        {category.name}
                      </option>
                    )
                  )}
                </select>

                <button
                  onClick={
                    editingId
                      ? updateExpense
                      : addExpense
                  }
                  className="
                    w-full
                    bg-white
                    text-black
                    rounded-2xl
                    p-4
                    font-semibold
                    mt-2
                  "
                >
                  {editingId
                    ? "Update Expense"
                    : "Save Expense"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}