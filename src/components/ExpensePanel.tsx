"use client";

import {
  Plus,
} from "lucide-react";
import ActionIconButton from "@/components/ui/ActionIconButton";
import { Button } from "@/components/ui/Button";

import ExpenseForm
from "./ExpenseForm";

import type {
  Category,
} from "../types/category";
import type { Currency } from "../types/currency";
import type {
  SavedNote,
} from "../hooks/useSavedNotes";

interface ExpensePanelProps {
  showExpenseForm: boolean;
  setShowExpenseForm: (value: boolean) => void;
  amount: string;
  setAmount: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  expenseDate: string;
  setExpenseDate: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  categories: Category[];
  editingId: number | null;
  currency: Currency;
  loading: boolean;
  saveExpense: () =>
    | void
    | boolean
    | Promise<void | boolean>;
  resetExpenseForm: () => void;
  setEditingId: (id: number | null) => void;
  showToggle?: boolean;
  savedNotes?: SavedNote[];
  addSavedNote?: (content: string) => void;
  updateSavedNote?: (
    id: string,
    content: string
  ) => void;
  deleteSavedNote?: (id: string) => void;
}

export default function ExpensePanel({

  showExpenseForm,
  setShowExpenseForm,

  amount,
  setAmount,

  note,
  setNote,

  expenseDate,
  setExpenseDate,

  selectedCategory,
  setSelectedCategory,

  categories,

  editingId,

  currency,

  loading,

  saveExpense,

  resetExpenseForm,

  setEditingId,

  showToggle = true,

  savedNotes,
  addSavedNote,
  updateSavedNote,
  deleteSavedNote,

}: ExpensePanelProps) {

  return (

    <>

      {showToggle && (
        showExpenseForm ? (
          <div className="mb-5 flex justify-end">
            <ActionIconButton
              kind="close"
              onClick={() => setShowExpenseForm(false)}
              title="Close expense form"
              aria-label="Close expense form"
            />
          </div>
        ) : (
          <Button
            onClick={() => setShowExpenseForm(true)}
            size="lg"
            className="mb-5 w-full"
          >
            <Plus size={18}/>
            Add Expense
          </Button>
        )
      )}

      {showExpenseForm && (

        <div className="mb-5">

          <ExpenseForm

            amount={amount}
            setAmount={setAmount}

            note={note}
            setNote={setNote}

            expenseDate={expenseDate}
            setExpenseDate={
              setExpenseDate
            }

            selectedCategory={
              selectedCategory
            }

            setSelectedCategory={
              setSelectedCategory
            }

            categories={categories}

            editingId={editingId}

            currency={currency}

            loading={loading}

            saveExpense={
              saveExpense
            }

            cancelEdit={() => {

              setEditingId(null);

              resetExpenseForm();
            }}

            savedNotes={savedNotes}
            addSavedNote={addSavedNote}
            updateSavedNote={updateSavedNote}
            deleteSavedNote={deleteSavedNote}

          />

        </div>

      )}

    </>

  );
}
