"use client";

import {
  useState,
} from "react";

import {
  createRecurringExpense,
  generateRecurringExpensesForMonth,
  getRecurringExpenses,
  removeRecurringExpense,
  updateRecurringExpense,
} from "../services/recurringExpenseService";

import type {
  RecurringExpense,
  RecurringExpensePayload,
} from "../types/recurringExpense";

function getErrorMessage(
  error:unknown
) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "";
}

function recurringErrorMessage(
  action:string,
  error:unknown
) {
  const message =
    getErrorMessage(
      error
    );

  if (
    message.includes(
      "schema cache"
    )
  ) {
    return `${action}: Supabase schema cache is stale. Run notify pgrst, 'reload schema'; in SQL Editor, then retry.`;
  }

  if (message) {
    return `${action}: ${message}`;
  }

  return `${action}. Run supabase/recurring_expenses.sql, then retry.`;
}

export default function useRecurringExpenses(
  selectedMonth:string
) {
  const [
    recurringExpenses,
    setRecurringExpenses,
  ] = useState<RecurringExpense[]>([]);

  const [
    recurringName,
    setRecurringName,
  ] = useState("");

  const [
    recurringAmount,
    setRecurringAmount,
  ] = useState("");

  const [
    recurringDescription,
    setRecurringDescription,
  ] = useState("");

  const [
    recurringCategory,
    setRecurringCategory,
  ] = useState("");

  const [
    recurringRepeatDay,
    setRecurringRepeatDay,
  ] = useState(
    String(
      new Date()
        .getDate()
    )
  );

  const [
    recurringIsActive,
    setRecurringIsActive,
  ] = useState(true);

  const [
    recurringEditingId,
    setRecurringEditingId,
  ] = useState<number | null>(null);

  const [
    recurringLoading,
    setRecurringLoading,
  ] = useState(false);

  const [
    recurringError,
    setRecurringError,
  ] = useState("");

  const [
    generatedRecurringCount,
    setGeneratedRecurringCount,
  ] = useState(0);

  function resetRecurringExpenseForm() {
    setRecurringName("");
    setRecurringAmount("");
    setRecurringDescription("");
    setRecurringCategory("");
    setRecurringRepeatDay(
      String(
        new Date()
          .getDate()
      )
    );
    setRecurringIsActive(true);
  }

  async function fetchRecurringExpenses() {
    try {
      setRecurringLoading(true);

      const {
        data,
        error,
      } = await getRecurringExpenses();

      if (error) {
        setRecurringExpenses([]);
        setRecurringError(
          recurringErrorMessage(
            "Could not load recurring expenses",
            error
          )
        );
        return false;
      }

      setRecurringExpenses(
        data
      );
      setRecurringError("");
      return true;
    } catch {
      setRecurringError(
        "Failed to fetch recurring expenses"
      );
      return false;
    } finally {
      setRecurringLoading(false);
    }
  }

  async function saveRecurringExpense() {
    try {
      setRecurringLoading(true);
      setRecurringError("");

      const amount =
        Number(
          recurringAmount
        );

      const repeatDay =
        Number(
          recurringRepeatDay
        );

      if (
        !recurringName.trim() ||
        !recurringAmount ||
        !recurringCategory ||
        Number.isNaN(amount) ||
        amount <= 0 ||
        !Number.isInteger(repeatDay) ||
        repeatDay < 1 ||
        repeatDay > 31
      ) {
        setRecurringError(
          "Please fill name, price, category, and day."
        );
        return false;
      }

      const payload:RecurringExpensePayload = {
        name:
          recurringName.trim(),
        amount,
        description:
          recurringDescription.trim() ||
          null,
        category_id:
          Number(
            recurringCategory
          ),
        repeat_day:
          repeatDay,
        is_active:
          recurringIsActive,
      };

      const saveError =
        recurringEditingId
          ? await updateRecurringExpense(
              recurringEditingId,
              payload
            )
          : await createRecurringExpense(
              payload
            );

      if (saveError) {
        setRecurringError(
          recurringErrorMessage(
            "Could not save recurring expense",
            saveError
          )
        );
        return false;
      }

      setRecurringEditingId(null);
      resetRecurringExpenseForm();
      await fetchRecurringExpenses();
      return true;
    } catch {
      setRecurringError(
        "Failed to save recurring expense"
      );
      return false;
    } finally {
      setRecurringLoading(false);
    }
  }

  async function deleteRecurringExpense(
    id:number
  ) {
    try {
      setRecurringLoading(true);
      setRecurringError("");

      const error =
        await removeRecurringExpense(
          id
        );

      if (error) {
        setRecurringError(
          "Failed to delete recurring expense"
        );
        return false;
      }

      await fetchRecurringExpenses();
      return true;
    } catch {
      setRecurringError(
        "Failed to delete recurring expense"
      );
      return false;
    } finally {
      setRecurringLoading(false);
    }
  }

  function startEditRecurringExpense(
    recurringExpense:RecurringExpense
  ) {
    setRecurringEditingId(
      recurringExpense.id
    );
    setRecurringName(
      recurringExpense.name
    );
    setRecurringAmount(
      recurringExpense.amount.toString()
    );
    setRecurringDescription(
      recurringExpense.description || ""
    );
    setRecurringCategory(
      recurringExpense.category_id.toString()
    );
    setRecurringRepeatDay(
      recurringExpense.repeat_day.toString()
    );
    setRecurringIsActive(
      recurringExpense.is_active
    );
  }

  async function generateDueRecurringExpenses() {
    try {
      const {
        createdCount,
        error,
      } = await generateRecurringExpensesForMonth(
        selectedMonth
      );

      if (error) {
        setRecurringError(
          recurringErrorMessage(
            "Could not generate recurring expenses",
            error
          )
        );
        return 0;
      }

      setGeneratedRecurringCount(
        createdCount
      );

      return createdCount;
    } catch {
      setRecurringError(
        "Failed to generate recurring expenses"
      );
      return 0;
    }
  }

  return {
    recurringExpenses,

    recurringName,
    setRecurringName,

    recurringAmount,
    setRecurringAmount,

    recurringDescription,
    setRecurringDescription,

    recurringCategory,
    setRecurringCategory,

    recurringRepeatDay,
    setRecurringRepeatDay,

    recurringIsActive,
    setRecurringIsActive,

    recurringEditingId,
    setRecurringEditingId,

    recurringLoading,
    recurringError,
    generatedRecurringCount,

    fetchRecurringExpenses,
    saveRecurringExpense,
    deleteRecurringExpense,
    startEditRecurringExpense,
    resetRecurringExpenseForm,
    generateDueRecurringExpenses,
  };
}
