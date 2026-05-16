"use client";

import {
  Pencil,
  Trash2,
} from "lucide-react";

import type {
  Income,
} from "../types/income";

interface IncomeCardProps {
  income: Income;
  startEditIncome: (income: Income) => void;
  deleteIncome: (id: number) => void | Promise<void>;
}

export default function IncomeCard({
  income,
  startEditIncome,
  deleteIncome,
}: IncomeCardProps) {

  return (

    <div className="
      bg-zinc-900
      rounded-3xl
      p-5
      flex
      gap-3
      justify-between
      items-center
    ">

      <div className="min-w-0">

        <p className="
          text-3xl
          font-bold
          break-words
        ">
          RM {income.amount}
        </p>

        <p className="
          text-zinc-400
          text-sm
          mt-1
          truncate
        ">
          {income.note || "Income"}
        </p>

      </div>

      <div className="
        flex
        gap-2
        shrink-0
      ">

        <button
          onClick={() =>
            startEditIncome(income)
          }
          className="
            bg-zinc-800
            p-3
            rounded-xl
          "
        >
          <Pencil size={16}/>
        </button>

        <button
          onClick={() =>
            deleteIncome(income.id)
          }
          className="
            bg-red-500
            p-3
            rounded-xl
          "
        >
          <Trash2 size={16}/>
        </button>

      </div>

    </div>
  );
}
