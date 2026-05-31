"use client";

import {
  CalendarClock,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import type {
  Category,
} from "../types/category";
import type {
  RecurringExpense,
} from "../types/recurringExpense";
import { getTypeColor } from "../utils/typeColors";

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

const repeatDays =
  Array.from(
    { length:31 },
    (_, index) => index + 1
  );

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

      <div
        className="
          bg-zinc-900
          border-2
          border-zinc-700
          rounded-3xl
          p-5
          space-y-3
          sm:p-6
        "
      >
        {recurringError && (
          <div
            className="
              bg-red-500
              text-white
              rounded-2xl
              p-3
              text-sm
              space-y-3
            "
          >
            <p>
              {recurringError}
            </p>

            <button
              type="button"
              onClick={refreshRecurringExpenses}
              className="
                rounded-xl
                bg-white
                px-3
                py-2
                text-xs
                font-bold
                text-black
              "
            >
              Retry
            </button>
          </div>
        )}

        {generatedRecurringCount > 0 && (
          <div
            className="
              bg-emerald-500/15
              border
              border-emerald-500/30
              text-emerald-300
              rounded-2xl
              p-3
              text-sm
            "
          >
            Added {generatedRecurringCount} recurring expense
            {generatedRecurringCount === 1
              ? ""
              : "s"} for this month.
          </div>
        )}

        <div
          className="
            grid
            gap-3
            md:grid-cols-2
          "
        >
          <input
            type="text"
            placeholder="Expense Name"
            value={recurringName}
            onChange={(event) =>
              setRecurringName(
                event.target.value
              )
            }
            className="
              w-full
              min-w-0
              bg-black
              rounded-2xl
              p-4
              outline-none
            "
          />

          <input
            type="number"
            placeholder="Price"
            value={recurringAmount}
            onChange={(event) =>
              setRecurringAmount(
                event.target.value
              )
            }
            className="
              w-full
              min-w-0
              bg-black
              rounded-2xl
              p-4
              outline-none
            "
          />
        </div>

        <textarea
          placeholder="Description"
          value={recurringDescription}
          onChange={(event) =>
            setRecurringDescription(
              event.target.value
            )
          }
          rows={3}
          className="
            w-full
            min-w-0
            resize-none
            bg-black
            rounded-2xl
            p-4
            outline-none
          "
        />

        <select
          value={recurringCategory}
          onChange={(event) =>
            setRecurringCategory(
              event.target.value
            )
          }
          className="
            w-full
            min-w-0
            bg-black
            rounded-2xl
            p-4
            outline-none
          "
        >
          <option value="">
            Select Category
          </option>

          {categories.map(
            (category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
                {" - "}
                {category.types?.name}
              </option>
            )
          )}
        </select>

        <div
          className="
            grid
            gap-3
            md:grid-cols-[minmax(0,1fr)_auto]
            md:items-center
          "
        >
          <select
            value={recurringRepeatDay}
            onChange={(event) =>
              setRecurringRepeatDay(
                event.target.value
              )
            }
            className="
              w-full
              min-w-0
              bg-black
              rounded-2xl
              p-4
              outline-none
            "
          >
            {repeatDays.map(
              (day) => (
                <option
                  key={day}
                  value={day}
                >
                  Every month on day {day}
                </option>
              )
            )}
          </select>

          <label
            className="
              flex
              items-center
              gap-3
              bg-black
              rounded-2xl
              px-4
              py-4
              text-sm
            "
          >
            <input
              type="checkbox"
              checked={recurringIsActive}
              onChange={(event) =>
                setRecurringIsActive(
                  event.target.checked
                )
              }
              className="
                size-4
                accent-white
              "
            />
            Active
          </label>
        </div>

        <div
          className="
            flex
            gap-3
          "
        >
          <button
            onClick={saveRecurringExpense}
            disabled={recurringLoading}
            className="
              w-full
              bg-white
              text-black
              rounded-2xl
              p-4
              font-bold
              disabled:opacity-50
            "
          >
            {recurringLoading
              ? "Saving..."
              : recurringEditingId
              ? "Update Schedule"
              : "Add Schedule"}
          </button>

          {recurringEditingId && (
            <button
              onClick={cancelEdit}
              title="Cancel edit"
              aria-label="Cancel edit"
              className="
                bg-white
                text-black
                rounded-2xl
                px-5
                hover:opacity-90
                transition-opacity
              "
            >
              <X size={18}/>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {recurringLoading &&
          recurringExpenses.length === 0 && (
            <div
              className="
                bg-zinc-900
                rounded-2xl
                p-8
                text-center
                text-zinc-400
              "
            >
              Loading...
            </div>
          )}

        {!recurringLoading &&
          recurringExpenses.length === 0 && (
            <div
              className="
                bg-zinc-900
                border
                border-zinc-800
                rounded-2xl
                p-8
                text-center
              "
            >
              <h3
                className="
                  text-xl
                  font-bold
                  mb-2
                "
              >
                No recurring expenses yet
              </h3>

              <p
                className="
                  text-zinc-400
                  text-sm
                "
              >
                Add a monthly schedule above.
              </p>
            </div>
          )}

        {recurringExpenses.map(
          (expense) => (
            <div
              key={expense.id}
              className="
                bg-zinc-900
                border-2
                border-zinc-700
                rounded-2xl
                p-4
              "
            >
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                "
              >
                <div className="min-w-0">
                  <p
                    className="
                      flex
                      items-center
                      gap-2
                      text-xs
                      text-zinc-500
                    "
                  >
                    <CalendarClock size={13}/>
                    Day {expense.repeat_day} monthly
                  </p>

                  <p
                    className="
                      mt-2
                      font-bold
                      truncate
                    "
                  >
                    {expense.name}
                  </p>

                  <p
                    className={`
                      mt-1
                      text-sm
                      truncate
                      ${getTypeColor(expense.categories?.types?.name)}
                    `}
                  >
                    {expense.categories?.name ||
                      "Uncategorized"}
                    {" - "}
                    {expense.categories?.types?.name ||
                      "Type"}
                  </p>

                  {expense.description && (
                    <p
                      className="
                        mt-2
                        text-sm
                        text-zinc-500
                        line-clamp-2
                      "
                    >
                      {expense.description}
                    </p>
                  )}
                </div>

                <div
                  className="
                    shrink-0
                    text-right
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

                  <p
                    className={`
                      mt-1
                      text-xs
                      ${
                        expense.is_active
                          ? "text-emerald-400"
                          : "text-zinc-500"
                      }
                    `}
                  >
                    {expense.is_active
                      ? "Active"
                      : "Paused"}
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
                        startEditRecurringExpense(
                          expense
                        )
                      }
                      title="Edit recurring expense"
                      aria-label="Edit recurring expense"
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
                      onClick={() =>
                        deleteRecurringExpense(
                          expense.id
                        )
                      }
                      title="Delete recurring expense"
                      aria-label="Delete recurring expense"
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
          )
        )}
      </div>

    </div>
  );
}
