"use client";

import {
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { confirmDelete } from "../utils/confirm";
import { formatCurrencyAmount } from "../utils/currency";

import type { Income } from "../types/income";

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
    <Card
      variant="item"
      padding="md"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <p className="break-words text-2xl font-semibold sm:text-3xl">
          {formatCurrencyAmount(Number(income.amount), income.currency)}
        </p>

        <p className="mt-1 text-sm text-zinc-400">
          {income.note || "Income"}
        </p>
      </div>

      <div className="flex shrink-0 gap-2 self-end sm:self-auto">
        <Button
          onClick={() => startEditIncome(income)}
          title="Edit income"
          aria-label="Edit income"
          size="iconLg"
        >
          <Pencil size={16} />
        </Button>

        <Button
          onClick={() => {
            if (confirmDelete("Delete this income?")) {
              deleteIncome(income.id);
            }
          }}
          title="Delete income"
          aria-label="Delete income"
          variant="danger"
          size="iconLg"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
}
