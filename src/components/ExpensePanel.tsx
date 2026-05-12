"use client";

import {
  Plus,
  X,
} from "lucide-react";

import ExpenseForm
from "./ExpenseForm";

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

}: any) {

  return (

    <>

      {/* BUTTON */}

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

          />

        </div>

      )}

    </>

  );
}