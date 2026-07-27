"use client";

import {
  CalendarClock,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import {
  cn,
  emptyStateStyles,
  fieldStyles,
  toneStyles,
} from "@/components/ui/styles";
import { confirmDelete } from "../utils/confirm";
import { getTypeColor } from "../utils/typeColors";

import type { Category } from "../types/category";
import type { RecurringExpense } from "../types/recurringExpense";

interface RecurringExpensePanelProps {
  recurringExpenses: RecurringExpense[];
  recurringName: string;
  setRecurringName: (value: string) => void;
  recurringAmount: string;
  setRecurringAmount: (value: string) => void;
  recurringDescription: string;
  setRecurringDescription: (value: string) => void;
  recurringCategory: string;
  setRecurringCategory: (value: string) => void;
  recurringRepeatDay: string;
  setRecurringRepeatDay: (value: string) => void;
  recurringIsActive: boolean;
  setRecurringIsActive: (value: boolean) => void;
  recurringEditingId: number | null;
  setRecurringEditingId: (id: number | null) => void;
  recurringLoading: boolean;
  recurringError: string;
  generatedRecurringCount: number;
  categories: Category[];
  refreshRecurringExpenses: () => Promise<boolean>;
  saveRecurringExpense: () => Promise<boolean>;
  deleteRecurringExpense: (id: number) => Promise<boolean>;
  startEditRecurringExpense: (expense: RecurringExpense) => void;
  resetRecurringExpenseForm: () => void;
}

const repeatDays = Array.from({ length: 31 }, (_, index) => index + 1);

export default function RecurringExpensePanel({
  recurringExpenses,
  recurringName,
  setRecurringName,
  recurringAmount,
  setRecurringAmount,
  recurringDescription,
  setRecurringDescription,
  recurringCategory,
  setRecurringCategory,
  recurringRepeatDay,
  setRecurringRepeatDay,
  recurringIsActive,
  setRecurringIsActive,
  recurringEditingId,
  setRecurringEditingId,
  recurringLoading,
  recurringError,
  generatedRecurringCount,
  categories,
  refreshRecurringExpenses,
  saveRecurringExpense,
  deleteRecurringExpense,
  startEditRecurringExpense,
  resetRecurringExpenseForm,
}: RecurringExpensePanelProps) {
  function cancelEdit() {
    setRecurringEditingId(null);
    resetRecurringExpenseForm();
  }

  return (
    <div className="space-y-5">
      <Card variant="item" padding="lg" className="space-y-3">
        {recurringError && (
          <div
            className={cn(
              "space-y-3 rounded-2xl border p-3 text-sm text-red-200",
              toneStyles.danger.subtleSurface
            )}
          >
            <p>{recurringError}</p>

            <Button
              type="button"
              onClick={refreshRecurringExpenses}
              size="sm"
            >
              Retry
            </Button>
          </div>
        )}

        {generatedRecurringCount > 0 && (
          <div
            className={cn(
              "rounded-2xl border p-3 text-sm text-emerald-300",
              toneStyles.success.subtleSurface
            )}
          >
            Added {generatedRecurringCount} recurring expense
            {generatedRecurringCount === 1 ? "" : "s"} for this month.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            type="text"
            placeholder="Expense Name"
            value={recurringName}
            onChange={(event) => setRecurringName(event.target.value)}
          />

          <Input
            type="number"
            placeholder="Price"
            value={recurringAmount}
            onChange={(event) => setRecurringAmount(event.target.value)}
          />
        </div>

        <Textarea
          placeholder="Description"
          value={recurringDescription}
          onChange={(event) => setRecurringDescription(event.target.value)}
          rows={3}
        />

        <Select
          value={recurringCategory}
          onChange={(event) => setRecurringCategory(event.target.value)}
        >
          <option value="">Select Category</option>

          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {" - "}
              {category.types?.name}
            </option>
          ))}
        </Select>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <Select
            value={recurringRepeatDay}
            onChange={(event) => setRecurringRepeatDay(event.target.value)}
          >
            {repeatDays.map((day) => (
              <option key={day} value={day}>
                Every month on day {day}
              </option>
            ))}
          </Select>

          <label
            className={cn(
              fieldStyles.base,
              fieldStyles.sizes.lg,
              "flex items-center gap-3 text-sm"
            )}
          >
            <input
              type="checkbox"
              checked={recurringIsActive}
              onChange={(event) => setRecurringIsActive(event.target.checked)}
              className="size-4 accent-white"
            />
            Active
          </label>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={saveRecurringExpense}
            disabled={recurringLoading}
            size="lg"
            className="w-full"
          >
            {recurringLoading
              ? "Saving..."
              : recurringEditingId
                ? "Update Schedule"
                : "Add Schedule"}
          </Button>

          {recurringEditingId && (
            <Button
              onClick={cancelEdit}
              size="iconLg"
              title="Cancel edit"
              aria-label="Cancel edit"
            >
              <X size={18} />
            </Button>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {recurringLoading && recurringExpenses.length === 0 && (
          <div className={cn(emptyStateStyles, "text-zinc-400")}>
            Loading...
          </div>
        )}

        {!recurringLoading && recurringExpenses.length === 0 && (
          <div className={emptyStateStyles}>
            <h3 className="mb-2 text-xl font-bold">
              No recurring expenses yet
            </h3>

            <p className="text-sm text-zinc-400">
              Add a monthly schedule above.
            </p>
          </div>
        )}

        {recurringExpenses.map((expense) => (
          <Card key={expense.id} variant="item" padding="sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <CalendarClock size={13} />
                  Day {expense.repeat_day} monthly
                </p>

                <p className="mt-2 truncate font-bold">{expense.name}</p>

                <p
                  className={`mt-1 truncate text-sm ${getTypeColor(
                    expense.categories?.types?.name
                  )}`}
                >
                  {expense.categories?.name || "Uncategorized"}
                  {" - "}
                  {expense.categories?.types?.name || "Type"}
                </p>

                {expense.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-500">
                    {expense.description}
                  </p>
                )}
              </div>

              <div className="max-w-[45%] shrink-0 text-right">
                <p className="break-words text-xl font-bold">
                  RM {Number(expense.amount).toFixed(2)}
                </p>

                <p
                  className={`mt-1 text-xs ${
                    expense.is_active ? "text-emerald-400" : "text-zinc-500"
                  }`}
                >
                  {expense.is_active ? "Active" : "Paused"}
                </p>

                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    onClick={() => startEditRecurringExpense(expense)}
                    title="Edit recurring expense"
                    aria-label="Edit recurring expense"
                    size="icon"
                  >
                    <Pencil size={16} />
                  </Button>

                  <Button
                    onClick={() => {
                      if (
                        confirmDelete("Delete this recurring expense rule?")
                      ) {
                        deleteRecurringExpense(expense.id);
                      }
                    }}
                    title="Delete recurring expense"
                    aria-label="Delete recurring expense"
                    variant="danger"
                    size="icon"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

