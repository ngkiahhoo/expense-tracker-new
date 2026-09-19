"use client";
import { useState } from "react";

import ActionIconButton from "@/components/ui/ActionIconButton";
import { Card } from "@/components/ui/Card";
import { confirmDelete } from "../utils/confirm";
import { formatCurrencyAmount } from "../utils/currency";

import type { Income } from "../types/income";
import useSessionState from "@/hooks/useSessionState";

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
  const [updatedId] = useSessionState("income:updated", 0);
  const [deleting, setDeleting] = useState(false);
  return (
    <Card
      variant="item"
      padding="md"
      className={`flex flex-wrap items-center justify-between gap-3 ${updatedId === income.id ? "ring-2 ring-teal-400" : ""}`}
      data-record-id={`income-${income.id}`}
    >
      <div className="min-w-0 flex-1">
        <p className="break-all text-lg font-semibold">
          {formatCurrencyAmount(Number(income.amount), income.currency)}
        </p>

        <p className="mt-1 text-sm text-zinc-400">
          {income.note || "Income"}
        </p>
        <p className="mt-1 text-xs text-zinc-400">{income.income_date}</p>
      </div>

      <div className="flex shrink-0 gap-2">
        <ActionIconButton
          kind="edit"
          disabled={deleting}
          onClick={() => startEditIncome(income)}
          title="Edit income"
          aria-label="Edit income"
        />

        <ActionIconButton
          kind="delete"
          disabled={deleting}
          onClick={async () => {
            if (confirmDelete(`Delete ${income.note || "this income"} (${formatCurrencyAmount(Number(income.amount), income.currency)})? This deducts that amount from the affected asset balance.`)) {
              setDeleting(true);
              try { await deleteIncome(income.id); } finally { setDeleting(false); }
            }
          }}
          title="Delete income"
          aria-label="Delete income"
        />
      </div>
    </Card>
  );
}
