import {
  CalendarDays,
  Pencil,
  Trash2,
} from "lucide-react";

import type {
  Expense,
} from "../types/expense";

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
        border
        border-zinc-800
        rounded-2xl
        p-4
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
            {expense.categories?.types?.name ||
              "Type"}
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

        <div className="text-right shrink-0">

          <p
            className="
              text-xl
              font-bold
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
                bg-zinc-800
                p-2
                rounded-xl
              "
            >
              <Pencil size={16}/>
            </button>

            <button
              onClick={() =>
                deleteExpense(
                  expense.id
                )
              }
              title="Delete expense"
              aria-label="Delete expense"
              className="
                bg-red-500
                p-2
                rounded-xl
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
