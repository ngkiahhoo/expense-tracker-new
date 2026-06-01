import {
  CalendarDays,
  Pencil,
  Trash2,
} from "lucide-react";
import { confirmDelete } from "../utils/confirm";

import type {
  Expense,
} from "../types/expense";
import { getTypeColor } from "../utils/typeColors";

interface ExpenseCardProps {
  expense: Expense;
  startEdit: (expense: Expense) => void;
  deleteExpense: (id: number) => void;
}

export default function ExpenseCard({
  expense,
  startEdit,
  deleteExpense,
}: ExpenseCardProps) {
  return (
    <div
      className="
        bg-zinc-900
        border-2
        border-zinc-700
        rounded-2xl
        p-4
        h-full
      "
    >

      <div
        className="
          flex
          justify-between
          items-start
          gap-4
        "
      >

        <div className="min-w-0">
          <p
            className="
              font-bold
              truncate
            "
          >
            {expense.note || "Expense"}
          </p>

          <p
            className="
              text-zinc-400
              text-sm
              mt-1
              truncate
            "
          >
            {expense.categories?.name ||
              "Uncategorized"}
            {" - "}
            <span className={getTypeColor(expense.categories?.types?.name)}>
              {expense.categories?.types?.name ||
                "Type"}
            </span>
          </p>

          <p
            className="
              flex
              items-center
              gap-1
              text-xs
              text-zinc-500
              mt-2
            "
          >
            <CalendarDays size={12}/>
            {expense.expense_date}
          </p>
        </div>

        <div
          className="
            text-right
            shrink-0
            max-w-[45%]
          "
        >

          <p
            className="
              text-xl
              font-bold
              break-words
            "
          >
            RM {Number(expense.amount).toFixed(2)}
          </p>

          <div
            className="
              flex
              gap-2
              mt-3
              justify-end
            "
          >

            <button
              onClick={() =>
                startEdit(expense)
              }
              title="Edit expense"
              aria-label="Edit expense"
              className="
                bg-white
                text-black
                p-2
                rounded-xl
                hover:opacity-90
                transition-opacity
              "
            >
              <Pencil size={16}/>
            </button>

            <button
              onClick={() => {
                if (
                  confirmDelete(
                    "确定要删除这笔支出吗？"
                  )
                ) {
                  deleteExpense(
                    expense.id
                  );
                }
              }}
              title="Delete expense"
              aria-label="Delete expense"
              className="
                bg-white
                text-black
                p-2
                rounded-xl
                hover:opacity-90
                transition-opacity
              "
            >
              <Trash2 size={16}/>
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
