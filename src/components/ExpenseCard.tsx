"use client";
import { useState } from "react";
import {
  CalendarDays,
} from "lucide-react";
import ActionIconButton from "@/components/ui/ActionIconButton";
import { Card } from "@/components/ui/Card";
import { confirmDelete } from "../utils/confirm";
import { getTypeColor } from "../utils/typeColors";
import { formatCurrencyAmount } from "../utils/currency";

import type { Expense } from "../types/expense";
import useSessionState from "@/hooks/useSessionState";

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
  const [updatedId] = useSessionState("records:updated", 0);
  const [deleting, setDeleting] = useState(false);
  return (
    <Card variant="item" padding="sm" className={`h-full ${updatedId === expense.id ? "ring-2 ring-teal-400" : ""}`} data-record-id={`expense-${expense.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-bold">
            {expense.note || "Expense"}
          </p>

          <p className="mt-1 break-words text-sm text-zinc-400">
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

        <div className="shrink-0 text-right">
          <p className="break-all text-lg font-bold">
            {formatCurrencyAmount(Number(expense.amount), expense.currency)}
          </p>

          <div className="mt-3 flex justify-end gap-2">
            <ActionIconButton
              kind="edit"
              disabled={deleting}
              onClick={() => startEdit(expense)}
              title="Edit expense"
              aria-label="Edit expense"
            />

            <ActionIconButton
              kind="delete"
              disabled={deleting}
              onClick={async () => {
                if (confirmDelete(`Delete ${expense.note || "this expense"} (${formatCurrencyAmount(Number(expense.amount), expense.currency)})? This restores that amount to the affected asset balance.${expense.payment_installment_id ? " The installment will be reversed." : ""}`)) {
                  setDeleting(true);
                  try { await deleteExpense(expense.id); } finally { setDeleting(false); }
                }
              }}
              title="Delete expense"
              aria-label="Delete expense"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
