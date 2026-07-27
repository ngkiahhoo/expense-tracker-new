import {
  CalendarDays,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { confirmDelete } from "../utils/confirm";
import { getTypeColor } from "../utils/typeColors";

import type { Expense } from "../types/expense";

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
    <Card variant="item" padding="sm" className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-bold">
            {expense.note || "Expense"}
          </p>

          <p className="mt-1 truncate text-sm text-zinc-400">
            {expense.categories?.name || "Uncategorized"}
            {" - "}
            <span className={getTypeColor(expense.categories?.types?.name)}>
              {expense.categories?.types?.name || "Type"}
            </span>
          </p>

          <p className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
            <CalendarDays size={12} />
            {expense.expense_date}
          </p>
        </div>

        <div className="max-w-[45%] shrink-0 text-right">
          <p className="break-words text-xl font-bold">
            RM {Number(expense.amount).toFixed(2)}
          </p>

          <div className="mt-3 flex justify-end gap-2">
            <Button
              onClick={() => startEdit(expense)}
              title="Edit expense"
              aria-label="Edit expense"
              size="icon"
            >
              <Pencil size={16} />
            </Button>

            <Button
              onClick={() => {
                if (confirmDelete("Delete this expense?")) {
                  deleteExpense(expense.id);
                }
              }}
              title="Delete expense"
              aria-label="Delete expense"
              variant="danger"
              size="icon"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

