"use client";

import {
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { confirmDelete } from "../utils/confirm";

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
      className="flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="break-words text-3xl font-bold">
          RM {income.amount}
        </p>

        <p className="mt-1 truncate text-sm text-zinc-400">
          {income.note || "Income"}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
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

