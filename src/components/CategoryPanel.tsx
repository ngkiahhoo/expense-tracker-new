"use client";

import ActionIconButton from "@/components/ui/ActionIconButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { getTypeColor } from "../utils/typeColors";

import type { Category } from "../types/category";

type ActionResult = {
  success: boolean;
  message?: string;
  error?: string;
};

interface CategoryPanelProps {
  showCategories: boolean;
  newCategory: string;
  setNewCategory: (value: string) => void;
  selectedType: string;
  setSelectedType: (value: string) => void;
  editingCategoryId: number | null;
  addCategory: () => Promise<ActionResult | boolean>;
  editCategory: (category: Category) => void;
  deleteCategory: (id: number) => Promise<ActionResult | void>;
  categories: Category[];
}

export default function CategoryPanel({
  showCategories,
  newCategory,
  setNewCategory,
  selectedType,
  setSelectedType,
  editingCategoryId,
  addCategory,
  editCategory,
  deleteCategory,
  categories,
}: CategoryPanelProps) {
  if (!showCategories) {
    return null;
  }

  return (
    <Card variant="default" padding="lg" className="mb-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
        <Input
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          placeholder="Category Name"
        />

        <Select
          value={selectedType}
          onChange={(event) => setSelectedType(event.target.value)}
        >
          <option value="needs">Needs</option>
          <option value="commitment">Commitment</option>
          <option value="wants">Wants</option>
        </Select>
      </div>

      <Button onClick={addCategory} size="lg" className="w-full">
        {editingCategoryId ? "Update Category" : "Add Category"}
      </Button>

      <div className="grid gap-3 pt-3 md:grid-cols-2">
        {categories.map((cat) => (
          <Card
            key={cat.id}
            variant="item"
            padding="sm"
            className="grid gap-3"
          >
            <div className="min-w-0">
              <p className="truncate font-bold">
                {cat.name || "Unnamed Category"}
              </p>

              <p
                className={`truncate text-sm ${getTypeColor(
                  cat.types?.name
                )}`}
              >
                {cat.types?.name || "No type"}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <ActionIconButton
                kind="edit"
                onClick={() => editCategory(cat)}
                title="Edit category"
                aria-label="Edit category"
              />

              <ActionIconButton
                kind="delete"
                onClick={() => deleteCategory(cat.id)}
                title="Delete category"
                aria-label="Delete category"
              />
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}

