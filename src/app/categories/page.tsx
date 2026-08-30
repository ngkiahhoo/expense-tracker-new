"use client";

import { useEffect, useState } from "react";
import ActionIconButton from "@/components/ui/ActionIconButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { supabase } from "../../lib/supabase";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("");
  const [types, setTypes] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchTypes();
  }, []);

  async function fetchTypes() {
    const { data } = await supabase.from("types").select("*");

    if (data) {
      setTypes(data);
    }
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from("categories")
      .select(
        `
        *,
        types (
          name
        )
      `
      )
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
      await supabase.from("categories").insert({
        name,
        type_id: Number(typeId),
      });
    }

    resetForm();
    fetchCategories();
  }

  async function deleteCategory(id: number) {
    await supabase.from("categories").delete().eq("id", id);
    fetchCategories();
  }

  function startEdit(cat: any) {
    setEditingId(cat.id);
    setName(cat.name);
    setTypeId(cat.type_id.toString());
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setTypeId("");
  }

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto grid max-w-md gap-5">
        <h1 className="text-4xl font-bold">Categories</h1>

        <Card variant="default" padding="sm" className="space-y-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Category Name"
          />

          <Select
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
          >
            <option value="">Select Type</option>

            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>

          <div className="flex gap-3">
            <Button onClick={saveCategory} size="lg" className="flex-1">
              {editingId ? "Update" : "Add"}
            </Button>

            {editingId && (
              <Button onClick={resetForm} variant="subtle" size="lg">
                Cancel
              </Button>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              variant="default"
              padding="sm"
              className="flex justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-medium">{cat.name}</p>

                <p className="text-sm text-zinc-400">
                  {cat.types?.name}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <ActionIconButton
                  kind="edit"
                  onClick={() => startEdit(cat)}
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
      </div>
    </main>
  );
}
