"use client";

import {
  Pencil,
  Trash2,
} from "lucide-react";

export default function IncomeCard({
  income,
  startEditIncome,
  deleteIncome,
}: any) {

  return (

    <div className="
      bg-zinc-900
      rounded-3xl
      p-5
      flex
      justify-between
      items-center
    ">

      <div>

        <p className="
          text-3xl
          font-bold
        ">
          RM {income.amount}
        </p>

        <p className="
          text-zinc-400
          text-sm
          mt-1
        ">
          {income.note || "Income"}
        </p>

      </div>

      <div className="
        flex
        gap-2
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