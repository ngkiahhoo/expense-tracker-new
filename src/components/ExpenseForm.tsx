"use client";

import {
  useState,
} from "react";

import {
  BookmarkPlus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import type {
  Category,
} from "../types/category";
import type {
  SavedNote,
} from "../hooks/useSavedNotes";

interface ExpenseFormProps {
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
  cancelEdit: () => void;
  savedNotes?: SavedNote[];
  addSavedNote?: (content: string) => void;
  updateSavedNote?: (
    id: string,
    content: string
  ) => void;
  deleteSavedNote?: (id: string) => void;
}

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

  savedNotes = [],
  addSavedNote,
  updateSavedNote,
  deleteSavedNote,
}: ExpenseFormProps) {

  const [
    selectedSavedNote,
    setSelectedSavedNote,
  ] = useState("");

  function handleSavedNoteSelect(
    id: string
  ) {
    setSelectedSavedNote(id);

    const selected =
      savedNotes.find(
        (item) => item.id === id
      );

    if (selected) {
      setNote(selected.content);
    }
  }

  function handleAddSavedNote() {
    addSavedNote?.(note);
  }

  function handleUpdateSavedNote() {
    if (!selectedSavedNote) {
      return;
    }

    updateSavedNote?.(
      selectedSavedNote,
      note
    );
  }

  function handleDeleteSavedNote() {
    if (!selectedSavedNote) {
      return;
    }

    deleteSavedNote?.(
      selectedSavedNote
    );

    setSelectedSavedNote("");
  }

  return (
    <div
      className="
        bg-zinc-900
        rounded-3xl
        p-5
        space-y-4
        sm:p-6
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
          min-w-0
          bg-black
          rounded-2xl
          p-4
          outline-none
        "
      />

      <div className="space-y-3">

        <div
          className="
            flex
            gap-2
          "
        >

          <input
            type="text"
            placeholder="Note"
            value={note}
            onChange={(e) =>
              setNote(e.target.value)
            }
            className="
              min-w-0
              flex-1
              bg-black
              rounded-2xl
              p-4
              outline-none
            "
          />

          <button
            type="button"
            onClick={handleAddSavedNote}
            title="Save note"
            aria-label="Save note"
            className="
              bg-zinc-800
              rounded-2xl
              px-4
              text-white
              disabled:opacity-40
            "
            disabled={!note.trim()}
          >
            <BookmarkPlus size={18}/>
          </button>

        </div>

        <select
          value={selectedSavedNote}
          onChange={(e) =>
            handleSavedNoteSelect(
              e.target.value
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
            {savedNotes.length
              ? "Choose saved note"
              : "No saved notes yet"}
          </option>

          {savedNotes.map(
            (savedNote) => (
              <option
                key={savedNote.id}
                value={savedNote.id}
              >
                {savedNote.content}
              </option>
            )
          )}
        </select>

        {selectedSavedNote && (
          <div
            className="
              grid
              grid-cols-2
              gap-2
            "
          >
            <button
              type="button"
              onClick={handleUpdateSavedNote}
              className="
                flex
                items-center
                justify-center
                gap-2
                bg-zinc-800
                rounded-2xl
                p-3
                text-sm
                font-bold
              "
            >
              <Pencil size={15}/>
              Update Note
            </button>

            <button
              type="button"
              onClick={handleDeleteSavedNote}
              className="
                flex
                items-center
                justify-center
                gap-2
                bg-red-500
                rounded-2xl
                p-3
                text-sm
                font-bold
              "
            >
              <Trash2 size={15}/>
              Delete Note
            </button>
          </div>
        )}

      </div>

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
          min-w-0
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
