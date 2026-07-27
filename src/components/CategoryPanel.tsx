"use client";

import {
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { getTypeColor } from "../utils/typeColors";

import type { Category } from "../types/category";

interface CategoryPanelProps {
  showCategories: boolean;
  newCategory: string;
  setNewCategory: (value: string) => void;
  selectedType: string;
  setSelectedType: (value: string) => void;
  editingCategoryId: number | null;
  addCategory: () => Promise<any>;
  editCategory: (category: Category) => void;
  deleteCategory: (id: number) => Promise<any>;
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

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => editCategory(cat)}
                size="sm"
                className="w-full"
              >
                <Pencil size={15} />
                Edit
              </Button>

              <Button
                onClick={() => deleteCategory(cat.id)}
                variant="danger"
                size="sm"
                className="w-full"
              >
                <Trash2 size={15} />
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}

