"use client";

import {
  Pencil,
  Trash2,
} from "lucide-react";

import type {
  Category,
} from "../types/category";

interface CategoryPanelProps {
  showCategories: boolean;
  newCategory: string;
  setNewCategory: (value: string) => void;
  selectedType: string;
  setSelectedType: (value: string) => void;
  editingCategoryId: number | null;
  addCategory: () => void | Promise<void>;
  editCategory: (category: Category) => void;
  deleteCategory: (id: number) => void | Promise<void>;
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

  return (

    <>


      {/* CATEGORY PANEL */}

      {showCategories && (

        <div
          className="
            bg-zinc-900
            rounded-3xl
            p-5
            mb-5
            space-y-3
            sm:p-6
          "
        >

          <div
            className="
              grid
              gap-3
              sm:grid-cols-[minmax(0,1fr)_160px]
            "
          >

            {/* INPUT */}

            <input
              value={newCategory}
              onChange={(e) =>
                setNewCategory(
                  e.target.value
                )
              }
              placeholder="Category Name"
              className="
                w-full
                min-w-0
                bg-black
                rounded-2xl
                p-4
              "
            />

            {/* TYPE */}

            <select
              value={selectedType}
              onChange={(e) =>
                setSelectedType(
                  e.target.value
                )
              }
              className="
                w-full
                min-w-0
                bg-black
                rounded-2xl
                p-4
              "
            >

              <option value="needs">
                Needs
              </option>

              <option value="wants">
                Wants
              </option>

              <option value="savings">
                Savings
              </option>

            </select>

          </div>

          {/* BUTTON */}

          <button
            onClick={addCategory}
            className="
              w-full
              bg-white
              text-black
              rounded-2xl
              p-4
              font-bold
            "
          >

            {editingCategoryId
              ? "Update Category"
              : "Add Category"}

          </button>

          {/* CATEGORY LIST */}

          <div
            className="
              grid
              gap-3
              pt-3
              md:grid-cols-2
            "
          >

            {categories.map(
              (cat) => (

                <div
                  key={cat.id}
                  className="
                    bg-black
                    rounded-2xl
                    p-4
                    grid
                    gap-3
                  "
                >

                  <div className="min-w-0">

                    <p
                      className="
                        font-bold
                        truncate
                      "
                    >
                      {cat.name || "Unnamed Category"}
                    </p>

                    <p
                      className="
                        text-sm
                        text-zinc-400
                        truncate
                      "
                    >
                      {cat.types?.name || "No type"}
                    </p>

                  </div>

                  <div
                    className="
                      grid
                      grid-cols-2
                      gap-2
                    "
                  >

                    <button
                      onClick={() =>
                        editCategory(cat)
                      }
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                        bg-zinc-800
                        px-4
                        py-3
                        rounded-xl
                        font-bold
                      "
                    >
                      <Pencil size={15}/>
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        deleteCategory(
                          cat.id
                        )
                      }
                      className="
                        flex
                        items-center
                        justify-center
                        gap-2
                        bg-red-500
                        px-4
                        py-3
                        rounded-xl
                        font-bold
                      "
                    >
                      <Trash2 size={15}/>
                      Delete
                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      )}

    </>

  );
}
