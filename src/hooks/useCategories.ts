"use client";

import {
  useState,
} from "react";

import {

  getCategories,

  createCategory,

  updateCategory,

  removeCategory,

  getTypeId,

} from "../services/categoryService";

export default function useCategories() {

  const [categories, setCategories] =
    useState<any[]>([]);

  const [newCategory, setNewCategory] =
    useState("");

  const [selectedType, setSelectedType] =
    useState("needs");

  const [
    editingCategoryId,
    setEditingCategoryId,
  ] = useState<number | null>(null);

  async function fetchCategories() {

    const data =
      await getCategories();

    setCategories(data);
  }

  async function addCategory() {

    if (!newCategory)
      return;

    const typeId =
      await getTypeId(
        selectedType
      );

    if (!typeId)
      return;

    const payload = {

      name:
        newCategory,

      type_id:
        typeId,
    };

    if (
      editingCategoryId
    ) {

      await updateCategory(
        editingCategoryId,
        payload
      );

    } else {

      await createCategory(
        payload
      );
    }

    setNewCategory("");

    setEditingCategoryId(
      null
    );

    fetchCategories();
  }

  async function deleteCategory(
    id:number
  ) {

    const error =
      await removeCategory(id);

    if (error) {

      alert(
        "Category is being used by expenses."
      );

      return;
    }

    fetchCategories();
  }

  function editCategory(
    cat:any
  ) {

    setEditingCategoryId(
      cat.id
    );

    setNewCategory(
      cat.name
    );

    setSelectedType(
      cat.types?.name
        ?.toLowerCase()
    );
  }

  return {

    categories,

    newCategory,
    setNewCategory,

    selectedType,
    setSelectedType,

    editingCategoryId,

    fetchCategories,

    addCategory,

    deleteCategory,

    editCategory,
  };
}