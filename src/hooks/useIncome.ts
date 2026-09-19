"use client";

import {
  useCallback,
  useRef,
  useState,
} from "react";

import {

  getIncomes,

  createIncome,

  updateIncome,

  removeIncome,

} from "../services/incomeService";
import type { Income } from "../types/income";
import type { Currency } from "../types/currency";
import { DEFAULT_CURRENCY, normalizeCurrency } from "../utils/currency";
import { notifyTransactionsChanged } from "../utils/transactionEvents";
import { dateKey, validDate } from "../utils/expenseMath";
import useSessionState from "./useSessionState";

export default function useIncome(
  selectedMonth:string,
  activeCurrency:Currency = DEFAULT_CURRENCY
) {

  const [incomes, setIncomes] =
    useState<Income[]>([]);

  const [incomeAmount, setIncomeAmount] =
    useSessionState("income-draft:amount", "");

  const [incomeNote, setIncomeNote] =
    useSessionState("income-draft:note", "");

  const [incomeEditingId, setIncomeEditingId] =
    useSessionState<number | null>("income-draft:id", null);

  const [incomeEditingCurrency, setIncomeEditingCurrency] =
    useSessionState<Currency | null>("income-draft:currency", null);
  const [incomeDate, setIncomeDate] = useSessionState("income-draft:date", dateKey());
  const [readError, setReadError] = useState("");
  const [loadedMonth, setLoadedMonth] = useState("");
  const readRequest = useRef(0), saving = useRef(false);

  const [incomeLoading, setIncomeLoading] =
    useState(false);

  const [incomeError, setIncomeError] =
    useState("");

  const fetchIncome = useCallback(async () => {
    const request = ++readRequest.current;

    try {
      const data =
        await getIncomes(
          selectedMonth
        );

      if (request !== readRequest.current) return;
      setIncomes(data);
      setLoadedMonth(selectedMonth);
      setReadError("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch income";
      if (request === readRequest.current) setReadError(msg);
    }
  }, [selectedMonth]);

  async function addIncome() {
    if (saving.current) return { success: false, error: "Saving is already in progress." };
    saving.current = true;

    try {
      setIncomeLoading(true);
      setIncomeError("");

      if (!incomeAmount || !Number.isFinite(Number(incomeAmount)) || Number(incomeAmount) <= 0 || !validDate(incomeDate)) {
        const msg = "Enter an amount above zero and a valid date.";
        setIncomeError(msg);
        return { success: false, error: msg };
      }

      const payload = {

        amount:
          Number(
            incomeAmount
          ),

        note:
          incomeNote,

        income_date:
          incomeDate,

        currency:
          incomeEditingCurrency ||
          activeCurrency,
      };

      if (
        incomeEditingId
      ) {

        const err = await updateIncome(
          incomeEditingId,
          payload
        );

        if (err) {
          const msg = err.message || "Failed to update income";
          setIncomeError(msg);
          return { success: false, error: msg };
        }

        setIncomeEditingId(
          null
        );

        setIncomeEditingCurrency(
          null
        );

      } else {

        const err = await createIncome(
          payload
        );

        if (err) {
          const msg = err.message || "Failed to create income";
          setIncomeError(msg);
          return { success: false, error: msg };
        }
      }

      setIncomeAmount("");

      setIncomeNote("");

      setIncomeEditingCurrency(null);
      setIncomeDate(dateKey());

      await fetchIncome();

      notifyTransactionsChanged({
        type: "income",
        month: selectedMonth,
        currency: incomeEditingCurrency || activeCurrency,
      });

      return { success: true, message: incomeEditingId ? "Income updated successfully" : "Income added successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add income";
      setIncomeError(msg);
      return { success: false, error: msg };
    } finally {
      saving.current = false;
      setIncomeLoading(false);
    }
  }

  async function deleteIncome(
    id:number
  ) {
    if (saving.current) return { success: false, error: "Another change is still saving." };
    saving.current = true;

    try {
      setIncomeLoading(true);
      setIncomeError("");

      const err = await removeIncome(id);

      if (err) {
        const msg = err.message || "Failed to delete income";
        setIncomeError(msg);
        return { success: false, error: msg };
      }

      await fetchIncome();

      notifyTransactionsChanged({
        type: "income",
        month: selectedMonth,
        currency: activeCurrency,
      });

      return { success: true, message: "Income deleted successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete income";
      setIncomeError(msg);
      return { success: false, error: msg };
    } finally {
      saving.current = false;
      setIncomeLoading(false);
    }
  }

  function startEditIncome(
    income:Income
  ) {
    setIncomeDate(income.income_date);

    setIncomeEditingId(
      income.id
    );

    setIncomeAmount(
      income.amount
        .toString()
    );

    setIncomeNote(
      income.note || ""
    );

    setIncomeEditingCurrency(
      normalizeCurrency(income.currency)
    );
  }

  return {

    incomes,

    incomeAmount,
    setIncomeAmount,

    incomeNote,
    setIncomeNote,

    incomeEditingId,
    incomeDate,
    setIncomeDate,
    incomeEditingCurrency,
    readError,
    reading: loadedMonth !== selectedMonth && !readError,
    resetIncomeForm: () => { setIncomeEditingId(null); setIncomeEditingCurrency(null); setIncomeAmount(""); setIncomeNote(""); setIncomeDate(dateKey()); },

    incomeLoading,
    incomeError,

    fetchIncome,

    addIncome,

    deleteIncome,

    startEditIncome,
  };
}
