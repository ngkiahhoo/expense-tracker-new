"use client";

import { useState } from "react";
import {
  BookmarkPlus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { confirmDelete } from "../utils/confirm";

import type { Category } from "../types/category";
import type { SavedNote } from "../hooks/useSavedNotes";

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
  saveExpense: () => void | boolean | Promise<void | boolean>;
  cancelEdit: () => void;
  savedNotes?: SavedNote[];
  addSavedNote?: (content: string) => void;
  updateSavedNote?: (id: string, content: string) => void;
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
  const [selectedSavedNote, setSelectedSavedNote] = useState("");

  function handleSavedNoteSelect(id: string) {
    setSelectedSavedNote(id);

    const selected = savedNotes.find((item) => item.id === id);
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

    updateSavedNote?.(selectedSavedNote, note);
  }

  function handleDeleteSavedNote() {
    if (!selectedSavedNote) {
      return;
    }

    if (confirmDelete("Delete this saved note?")) {
      deleteSavedNote?.(selectedSavedNote);
      setSelectedSavedNote("");
    }
  }

  return (
    <Card variant="default" padding="lg" className="space-y-4">
      <Input
        type="number"
        placeholder="Expense Amount"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="flex-1"
          />

          <Button
            type="button"
            onClick={handleAddSavedNote}
            size="iconLg"
            title="Save note"
            aria-label="Save note"
            disabled={!note.trim()}
          >
            <BookmarkPlus size={18} />
          </Button>
        </div>

        <Select
          value={selectedSavedNote}
          onChange={(event) => handleSavedNoteSelect(event.target.value)}
        >
          <option value="">
            {savedNotes.length ? "Choose saved note" : "No saved notes yet"}
          </option>

          {savedNotes.map((savedNote) => (
            <option key={savedNote.id} value={savedNote.id}>
              {savedNote.content}
            </option>
          ))}
        </Select>

        {selectedSavedNote && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={handleUpdateSavedNote}
              size="sm"
            >
              <Pencil size={15} />
              Update Note
            </Button>

            <Button
              type="button"
              onClick={handleDeleteSavedNote}
              variant="danger"
              size="sm"
            >
              <Trash2 size={15} />
              Delete Note
            </Button>
          </div>
        )}
      </div>

      <Input
        type="date"
        value={expenseDate}
        onChange={(event) => setExpenseDate(event.target.value)}
      />

      <Select
        value={selectedCategory}
        onChange={(event) => setSelectedCategory(event.target.value)}
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

      <div className="flex gap-3">
      <Button
        onClick={saveExpense}
        disabled={loading}
        size="lg"
        className="flex-1"
      >
        {loading
          ? "Saving..."
          : editingId
            ? "Update Expense"
            : "Add Expense"}
      </Button>

      {editingId && (
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
  );
}

