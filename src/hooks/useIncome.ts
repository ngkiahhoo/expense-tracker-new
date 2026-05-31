"use client";

import {
  useState,
} from "react";

import {

  getIncomes,

  createIncome,

  updateIncome,

  removeIncome,

} from "../services/incomeService";

export default function useIncome(
  selectedMonth:string
) {

  const [incomes, setIncomes] =
    useState<any[]>([]);

  const [incomeAmount, setIncomeAmount] =
    useState("");

  const [incomeNote, setIncomeNote] =
    useState("");

  const [incomeEditingId, setIncomeEditingId] =
    useState<number | null>(null);

  const [incomeLoading, setIncomeLoading] =
    useState(false);

  const [incomeError, setIncomeError] =
    useState("");

  async function fetchIncome() {

    try {
      const data =
        await getIncomes(
          selectedMonth
        );

      setIncomes(data);
      setIncomeError("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch income";
      setIncomeError(msg);
    }
  }

  async function addIncome() {

    try {
      setIncomeLoading(true);
      setIncomeError("");

      if (!incomeAmount) {
        const msg = "Please enter amount";
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
          `${selectedMonth}-01`,
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

      await fetchIncome();

      return { success: true, message: incomeEditingId ? "Income updated successfully" : "Income added successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add income";
      setIncomeError(msg);
      return { success: false, error: msg };
    } finally {
      setIncomeLoading(false);
    }
  }

  async function deleteIncome(
    id:number
  ) {

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

      return { success: true, message: "Income deleted successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete income";
      setIncomeError(msg);
      return { success: false, error: msg };
    } finally {
      setIncomeLoading(false);
    }
  }

  function startEditIncome(
    income:any
  ) {

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
  }

  return {

    incomes,

    incomeAmount,
    setIncomeAmount,

    incomeNote,
    setIncomeNote,

    incomeEditingId,

    incomeLoading,
    incomeError,

    fetchIncome,

    addIncome,

    deleteIncome,

    startEditIncome,
  };
}