"use client";

import {
  Plus,
  X,
} from "lucide-react";

export default function ExpenseForm({
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
  cancelEdit,
}: any) {

  return (
    <div
      className="
        bg-zinc-900
        rounded-3xl
        p-5
        space-y-4
      "
    >

      <input
        type="number"
        placeholder="Expense Amount"
        value={amount}
        onChange={(e) =>
          setAmount(e.target.value)
        }
        className="
          w-full
          bg-black
          rounded-2xl
          p-4
          outline-none
        "
      />

      <input
        type="text"
        placeholder="Note"
        value={note}
        onChange={(e) =>
          setNote(e.target.value)
        }
        className="
          w-full
          bg-black
          rounded-2xl
          p-4
          outline-none
        "
      />

      <input
        type="date"
        value={expenseDate}
        onChange={(e) =>
          setExpenseDate(
            e.target.value
          )
        }
        className="
          w-full
          bg-black
          rounded-2xl
          p-4
          outline-none
        "
      />

      <select
        value={selectedCategory}
        onChange={(e) =>
          setSelectedCategory(
            e.target.value
          )
        }
        className="
          w-full
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
          (category: any) => (
            <option
  key={category.id}
  value={category.id}
>
  {category.name}
  {" · "}
  {category.types?.name}
</option>
          )
        )}

      </select>

      <div
        className="
          flex
          gap-3
        "
      >

        <button
  onClick={saveExpense}
  disabled={loading}
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

  {loading
    ? "Saving..."
    : editingId
    ? "Update Expense"
    : "Add Expense"}

</button>

        {editingId && (
          <button
            onClick={cancelEdit}
            className="
              bg-zinc-800
              rounded-2xl
              px-5
            "
          >
            <X size={18}/>
          </button>
        )}

      </div>

    </div>
  );
}