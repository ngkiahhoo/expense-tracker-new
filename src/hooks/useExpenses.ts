"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";

import {
  Expense,
} from "../types/expense";
import type { Currency } from "../types/currency";
import { DEFAULT_CURRENCY, normalizeCurrency } from "../utils/currency";
import { notifyTransactionsChanged } from "../utils/transactionEvents";
import { dateKey, validDate } from "../utils/expenseMath";
import useSessionState from "./useSessionState";

import {

  getExpenses,

  createExpense,

  updateExpense,

  removeExpense,

  removeExpensesByMonth,

} from "../services/expenseService";

export default function useExpenses(
  selectedMonth:string,
  activeCurrency:Currency = DEFAULT_CURRENCY
) {

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [amount, setAmount] =
    useSessionState("expense-draft:amount", "");

  const [note, setNote] =
    useSessionState("expense-draft:note", "");

  const [expenseDate, setExpenseDate] =
    useSessionState("expense-draft:date", dateKey());

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useSessionState("expense-draft:category", "");

  const [editingId, setEditingId] =
    useSessionState<number | null>("expense-draft:id", null);

  const [editingCurrency, setEditingCurrency] =
    useSessionState<Currency | null>("expense-draft:currency", null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");
  const [readError, setReadError] = useState("");
  const [loadedMonth, setLoadedMonth] = useState("");
  const readRequest = useRef(0);
  const saving = useRef(false);
  const deleting = useRef(new Set<number>());

  const fetchExpenses = useCallback(async () => {
    const request = ++readRequest.current;

    try {

      setLoading(true);

      const data =
        await getExpenses(
          selectedMonth
        );

      if (request !== readRequest.current) return;
      setExpenses(data || []);
      setReadError("");
      setLoadedMonth(selectedMonth);

    } catch {

      if (request !== readRequest.current) return;
      setReadError(
        "Failed to fetch expenses"
      );

    } finally {

      if (request === readRequest.current) setLoading(false);
    }
  }, [selectedMonth]);

  async function saveExpense() {
    if (saving.current) return { success: false, error: "Saving is already in progress." };
    saving.current = true;

    try {

      setLoading(true);

      setError("");

      if (
        !amount ||
        !selectedCategory || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !validDate(expenseDate)
      ) {

        const errorMsg =
          "Enter an amount above zero, a valid date and a category.";

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

        currency:
          editingCurrency ||
          activeCurrency,
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
        throw new Error(errorMsg);
      }

      if (editingId) {
        setEditingId(null);
        setEditingCurrency(null);
      }

      resetExpenseForm();

      await fetchExpenses();

      notifyTransactionsChanged({
        type: "expense",
        month: selectedMonth,
        currency: editingCurrency || activeCurrency,
      });

      return { success: true, message: editingId ? "Expense updated successfully" : "Expense added successfully" };

    } catch (err) {

      const errorMsg = err instanceof Error ? err.message : "Failed to save expense";
      setError(
        errorMsg
      );

      return { success: false, error: errorMsg };

    } finally {
      saving.current = false;

      setLoading(false);
    }
  }

  function resetExpenseForm() {

    setAmount("");

    setNote("");

    setEditingCurrency(null);

    setExpenseDate(dateKey());
  }

  async function deleteExpense(
    id:number
  ) {
    if (deleting.current.has(id)) return { success: false, error: "Deletion is already in progress." };
    deleting.current.add(id);

    try {

      const error = await removeExpense(id);

      if (error) {
        const msg = error.message || "Failed to delete expense";
        setError(msg);
        return { success: false, error: msg };
      }

      await fetchExpenses();

      notifyTransactionsChanged({
        type: "expense",
        month: selectedMonth,
        currency: activeCurrency,
      });

      return { success: true, message: "Expense deleted successfully" };

    } catch (err) {

      const msg = err instanceof Error ? err.message : "Failed to delete expense";
      setError(
        msg
      );

      return { success: false, error: msg };
    } finally { deleting.current.delete(id); }
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
      notifyTransactionsChanged({
        type: "expense",
        month: selectedMonth,
        currency: activeCurrency,
      });

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

    setEditingCurrency(
      normalizeCurrency(expense.currency)
    );

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
    readError,
    reading: loadedMonth !== selectedMonth && !readError,
    editingCurrency,

    error,

    fetchExpenses,

    saveExpense,

    deleteExpense,

    deleteMonthExpenses,

    startEdit,

    resetExpenseForm,
  };
}
