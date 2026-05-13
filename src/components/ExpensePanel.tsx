"use client";

import {
  Plus,
  X,
} from "lucide-react";

import ExpenseForm
from "./ExpenseForm";

import type {
  Category,
} from "../types/category";
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

      {/* BUTTON */}

      {showToggle && (

        <button
          onClick={() =>
            setShowExpenseForm(
              !showExpenseForm
            )
          }
          className="
            w-full
            bg-zinc-900
            rounded-2xl
            p-4
            mb-5
            font-bold
            flex
            justify-center
            items-center
            gap-2
          "
        >

          {showExpenseForm ? (
            <>
              <X size={18}/>
              Close Expense
            </>
          ) : (
            <>
              <Plus size={18}/>
              Add Expense
            </>
          )}

        </button>

      )}

      {/* FORM */}

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
