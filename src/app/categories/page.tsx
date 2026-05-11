"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CategoriesPage() {
  const [categories, setCategories] =
    useState<any[]>([]);

  const [name, setName] =
    useState("");

  const [typeId, setTypeId] =
    useState("");

  const [types, setTypes] =
    useState<any[]>([]);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchTypes();
  }, []);

  async function fetchTypes() {
    const { data } = await supabase
      .from("types")
      .select("*");

    if (data) {
      setTypes(data);
    }
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from("categories")
      .select(`
        *,
        types (
          name
        )
      `)
      .order("name");

    if (data) {
      setCategories(data);
    }
  }

  async function saveCategory() {
    if (!name || !typeId) return;

    if (editingId) {
      await supabase
        .from("categories")
        .update({
          name,
          type_id: Number(typeId),
        })
        .eq("id", editingId);
    } else {
      await supabase
        .from("categories")
        .insert({
          name,
          type_id: Number(typeId),
        });
    }

    resetForm();
    fetchCategories();
  }

  async function deleteCategory(
    id: number
  ) {
    await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    fetchCategories();
  }

  function startEdit(cat: any) {
    setEditingId(cat.id);

    setName(cat.name);

    setTypeId(
      cat.type_id.toString()
    );
  }

  function resetForm() {
    setEditingId(null);

    setName("");

    setTypeId("");
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">

        <h1 className="text-4xl font-bold mb-6">
          Categories
        </h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 mb-6 space-y-3">

          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Category Name"
            className="w-full bg-black border border-zinc-800 rounded-2xl p-4"
          />

          <select
            value={typeId}
            onChange={(e) =>
              setTypeId(e.target.value)
            }
            className="w-full bg-black border border-zinc-800 rounded-2xl p-4"
          >
            <option value="">
              Select Type
            </option>

            {types.map((type) => (
              <option
                key={type.id}
                value={type.id}
              >
                {type.name}
              </option>
            ))}
          </select>

          <div className="flex gap-3">
            <button
              onClick={saveCategory}
              className="flex-1 bg-white text-black rounded-2xl p-4 font-bold"
            >
              {editingId
                ? "Update"
                : "Add"}
            </button>

            {editingId && (
              <button
                onClick={resetForm}
                className="bg-zinc-700 px-4 rounded-2xl"
              >
                Cancel
              </button>
            )}
          </div>

        </div>

        <div className="space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex justify-between"
            >
              <div>
                <p className="font-medium">
                  {cat.name}
                </p>

                <p className="text-sm text-gray-400">
                  {cat.types?.name}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    startEdit(cat)
                  }
                  className="bg-blue-500 px-3 rounded-xl"
                >
                  Edit
                </button>

                <button
                  onClick={() =>
                    deleteCategory(cat.id)
                  }
                  className="bg-red-500 px-3 rounded-xl"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}