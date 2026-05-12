"use client";

import {
  useState,
} from "react";

import {
  Expense,
} from "../types/expense";

import {

  getExpenses,

  createExpense,

  updateExpense,

  removeExpense,

} from "../services/expenseService";

export default function useExpenses(
  selectedMonth:string
) {

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

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

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("");

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function fetchExpenses() {

    try {

      setLoading(true);

      const data =
        await getExpenses(
          selectedMonth
        );

      setExpenses(data || []);

    } catch {

      setError(
        "Failed to fetch expenses"
      );

    } finally {

      setLoading(false);
    }
  }

  async function saveExpense() {

    try {

      setLoading(true);

      setError("");

      if (
        !amount ||
        !note ||
        !selectedCategory
      ) {

        setError(
          "Please fill all fields"
        );

        return;
      }

      const payload = {

        amount:
          Number(amount),

        note,

        expense_date:
          expenseDate,

        category_id:
          Number(
            selectedCategory
          ),
      };

      if (editingId) {

        await updateExpense(
          editingId,
          payload
        );

        setEditingId(null);

      } else {

        await createExpense(
          payload
        );
      }

      resetExpenseForm();

      await fetchExpenses();

    } catch {

      setError(
        "Failed to save expense"
      );

    } finally {

      setLoading(false);
    }
  }

  function resetExpenseForm() {

    setAmount("");

    setNote("");

    setSelectedCategory("");

    setExpenseDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );
  }

  async function deleteExpense(
    id:number
  ) {

    try {

      await removeExpense(id);

      fetchExpenses();

    } catch {

      setError(
        "Failed to delete expense"
      );
    }
  }

  function startEdit(
    expense:Expense
  ) {

    setEditingId(
      expense.id
    );

    setAmount(
      expense.amount.toString()
    );

    setNote(
      expense.note
    );

    setExpenseDate(
      expense.expense_date
    );

    setSelectedCategory(
      expense.category_id.toString()
    );

    window.scrollTo({
      top:0,
      behavior:"smooth",
    });
  }

  return {

    expenses,

    amount,
    setAmount,

    note,
    setNote,

    expenseDate,
    setExpenseDate,

    selectedCategory,
    setSelectedCategory,

    editingId,
    setEditingId,

    loading,

    error,

    fetchExpenses,

    saveExpense,

    deleteExpense,

    startEdit,

    resetExpenseForm,
  };
}