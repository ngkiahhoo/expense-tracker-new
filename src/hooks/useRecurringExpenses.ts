"use client";

import {
  useCallback,
  useState,
} from "react";

import {
  createRecurringExpense,
  generateRecurringExpensesForMonth,
  getRecurringExpenses,
  removeRecurringExpense,
  updateGeneratedExpenseForRecurring,
  updateRecurringExpense,
  getRecurringExpenseDate,
} from "../services/recurringExpenseService";
import { formatRecurringExpenseNote } from "../services/recurringExpenseService";

import type {
  RecurringExpense,
} from "../types/recurringExpense";
import type { Currency } from "../types/currency";
import { DEFAULT_CURRENCY, normalizeCurrency } from "../utils/currency";
import {
  buildRecurringExpensePayload,
  getRecurringErrorMessage,
  recurringExpenseToFormValues,
} from "../utils/recurringExpenseForm";

export default function useRecurringExpenses(
  currentMonth:string,
  activeCurrency:Currency = DEFAULT_CURRENCY
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
    recurringEditingOriginal,
    setRecurringEditingOriginal,
  ] = useState<RecurringExpense | null>(null);

  const [
    recurringEditingCurrency,
    setRecurringEditingCurrency,
  ] = useState<Currency | null>(null);

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
    setRecurringEditingOriginal(null);
    setRecurringEditingCurrency(null);
  }

  const fetchRecurringExpenses = useCallback(async () => {
    try {
      setRecurringLoading(true);

      const {
        data,
        error,
      } = await getRecurringExpenses();

      if (error) {
        setRecurringExpenses([]);
        setRecurringError(
          getRecurringErrorMessage(
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
  }, []);

  async function saveRecurringExpense() {
    try {
      setRecurringLoading(true);
      setRecurringError("");

      const {
        error: validationError,
        payload,
      } = buildRecurringExpensePayload({
        activeCurrency,
        amount: recurringAmount,
        category: recurringCategory,
        description: recurringDescription,
        editingCurrency: recurringEditingCurrency,
        isActive: recurringIsActive,
        name: recurringName,
        repeatDay: recurringRepeatDay,
      });

      if (!payload) {
        setRecurringError(validationError);
        return { success: false, error: validationError };
      }

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
        const msg = getRecurringErrorMessage(
            "Could not save recurring expense",
            saveError
          );
        setRecurringError(msg);
        return { success: false, error: msg };
      }

      if (
        recurringEditingId &&
        recurringEditingOriginal
      ) {
        const syncError =
          await updateGeneratedExpenseForRecurring(
            currentMonth,
            recurringEditingOriginal,
            {
              amount: payload.amount,
              note: formatRecurringExpenseNote(payload.name, payload.description || null),
              expense_date:
                getRecurringExpenseDate(
                  currentMonth,
                  payload.repeat_day
                ),
              category_id:
                payload.category_id,
              currency:
                payload.currency,
            }
          );

        if (syncError) {
          const msg = getRecurringErrorMessage(
            "Could not update generated expense",
            syncError
          );
          setRecurringError(msg);
          return { success: false, error: msg };
        }
      }

      setRecurringEditingId(null);
      resetRecurringExpenseForm();
      await fetchRecurringExpenses();
      return { success: true, message: recurringEditingId ? "Recurring expense updated successfully" : "Recurring expense added successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save recurring expense";
      setRecurringError(msg);
      return { success: false, error: msg };
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
        const msg = "Failed to delete recurring expense";
        setRecurringError(msg);
        return { success: false, error: msg };
      }

      await fetchRecurringExpenses();
      return { success: true, message: "Recurring expense deleted successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete recurring expense";
      setRecurringError(msg);
      return { success: false, error: msg };
    } finally {
      setRecurringLoading(false);
    }
  }

  function startEditRecurringExpense(
    recurringExpense:RecurringExpense
  ) {
    const formValues = recurringExpenseToFormValues(
      recurringExpense
    );

    setRecurringEditingId(
      recurringExpense.id
    );
    setRecurringEditingOriginal(
      recurringExpense
    );
    setRecurringName(formValues.name);
    setRecurringAmount(
      formValues.amount
    );
    setRecurringDescription(
      formValues.description
    );
    setRecurringCategory(
      formValues.category
    );
    setRecurringRepeatDay(
      formValues.repeatDay
    );
    setRecurringIsActive(
      formValues.isActive
    );
    setRecurringEditingCurrency(
      normalizeCurrency(recurringExpense.currency)
    );
  }

  const generateDueRecurringExpenses = useCallback(async () => {
    try {
      const {
        createdCount,
        error,
      } = await generateRecurringExpensesForMonth(
        currentMonth
      );

      if (error) {
        setRecurringError(
          getRecurringErrorMessage(
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
  }, [currentMonth]);

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
