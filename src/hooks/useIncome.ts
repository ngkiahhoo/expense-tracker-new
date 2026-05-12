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

  async function fetchIncome() {

    const data =
      await getIncomes(
        selectedMonth
      );

    setIncomes(data);
  }

  async function addIncome() {

    if (!incomeAmount)
      return;

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

      await updateIncome(
        incomeEditingId,
        payload
      );

      setIncomeEditingId(
        null
      );

    } else {

      await createIncome(
        payload
      );
    }

    setIncomeAmount("");

    setIncomeNote("");

    fetchIncome();
  }

  async function deleteIncome(
    id:number
  ) {

    await removeIncome(id);

    fetchIncome();
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

    fetchIncome,

    addIncome,

    deleteIncome,

    startEditIncome,
  };
}