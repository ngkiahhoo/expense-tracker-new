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

  removeExpensesByMonth,

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

        const errorMsg =
          "Please fill all fields";

        setError(
          errorMsg
        );

        return { success: false, error: errorMsg };
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

      const saveError =
        editingId
          ? await updateExpense(
              editingId,
              payload
            )
          : await createExpense(
              payload
            );

      if (saveError) {
        const errorMsg = saveError.message || "Failed to save expense";
        setError(errorMsg);
        throw errorMsg;
      }

      if (editingId) {
        setEditingId(null);
      }

      resetExpenseForm();

      await fetchExpenses();

      return { success: true, message: editingId ? "Expense updated successfully" : "Expense added successfully" };

    } catch (err) {

      const errorMsg = err instanceof Error ? err.message : "Failed to save expense";
      setError(
        errorMsg
      );

      return { success: false, error: errorMsg };

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

      const error = await removeExpense(id);

      if (error) {
        const msg = error.message || "Failed to delete expense";
        setError(msg);
        return { success: false, error: msg };
      }

      await fetchExpenses();

      return { success: true, message: "Expense deleted successfully" };

    } catch (err) {

      const msg = err instanceof Error ? err.message : "Failed to delete expense";
      setError(
        msg
      );

      return { success: false, error: msg };
    }
  }

  async function deleteMonthExpenses(
    selectedMonth:string
  ) {
    try {
      const error = await removeExpensesByMonth(
        selectedMonth
      );

      if (error) {
        const msg = error.message || "Failed to delete monthly expenses";
        setError(msg);
        return { success: false, error: msg };
      }

      await fetchExpenses();
      return { success: true, message: "Monthly expenses deleted successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete monthly expenses";
      setError(msg);
      return { success: false, error: msg };
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

    deleteMonthExpenses,

    startEdit,

    resetExpenseForm,
  };
}
