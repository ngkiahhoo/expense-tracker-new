"use client";

import ActionIconButton from "@/components/ui/ActionIconButton";
import { Card } from "@/components/ui/Card";
import { confirmDelete } from "../utils/confirm";
import { formatCurrencyAmount } from "../utils/currency";

import type { Income } from "../types/income";

interface IncomeCardProps {
  income: Income;
  startEditIncome: (income: Income) => void;
  deleteIncome: (id: number) => void | Promise<unknown>;
}

export default function IncomeCard({
  income,
  startEditIncome,
  deleteIncome,
}: IncomeCardProps) {
  return (
    <Card
      variant="item"
      padding="md"
      className="flex items-center justify-between gap-3"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate whitespace-nowrap text-xl font-semibold sm:text-2xl">
          {formatCurrencyAmount(Number(income.amount), income.currency)}
        </p>

        <p className="mt-1 text-sm text-zinc-400">
          {income.note || "Income"}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <ActionIconButton
          kind="edit"
          onClick={() => startEditIncome(income)}
          title="Edit income"
          aria-label="Edit income"
        />

        <ActionIconButton
          kind="delete"
          onClick={() => {
            if (confirmDelete("Delete this income?")) {
              deleteIncome(income.id);
            }
          }}
          title="Delete income"
          aria-label="Delete income"
        />
      </div>
    </Card>
  );
}
