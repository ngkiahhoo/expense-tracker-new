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

  const [categoryLoading, setCategoryLoading] =
    useState(false);

  const [categoryError, setCategoryError] =
    useState("");

  async function fetchCategories() {

    try {
      setCategoryLoading(true);
      const data =
        await getCategories();

      setCategories(data);
      setCategoryError("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch categories";
      setCategoryError(msg);
    } finally {
      setCategoryLoading(false);
    }
  }

  async function addCategory() {

    try {
      setCategoryLoading(true);
      setCategoryError("");

      if (!newCategory) {
        const msg = "Please enter category name";
        setCategoryError(msg);
        return { success: false, error: msg };
      }

      const typeId =
        await getTypeId(
          selectedType
        );

      if (!typeId) {
        const msg = "Invalid category type";
        setCategoryError(msg);
        return { success: false, error: msg };
      }

      const payload = {

        name:
          newCategory,

        type_id:
          typeId,
      };

      if (
        editingCategoryId
      ) {

        const err = await updateCategory(
          editingCategoryId,
          payload
        );

        if (err) {
          const msg = err.message || "Failed to update category";
          setCategoryError(msg);
          return { success: false, error: msg };
        }

      } else {

        const err = await createCategory(
          payload
        );

        if (err) {
          const msg = err.message || "Failed to create category";
          setCategoryError(msg);
          return { success: false, error: msg };
        }
      }

      setNewCategory("");

      setEditingCategoryId(
        null
      );

      await fetchCategories();

      return { success: true, message: editingCategoryId ? "Category updated successfully" : "Category added successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add category";
      setCategoryError(msg);
      return { success: false, error: msg };
    } finally {
      setCategoryLoading(false);
    }
  }

  async function deleteCategory(
    id:number
  ) {

    try {
      setCategoryLoading(true);
      setCategoryError("");

      const error =
        await removeCategory(id);

      if (error) {

        const msg = "Category is being used by expenses.";
        setCategoryError(msg);

        return { success: false, error: msg };
      }

      await fetchCategories();

      return { success: true, message: "Category deleted successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete category";
      setCategoryError(msg);
      return { success: false, error: msg };
    } finally {
      setCategoryLoading(false);
    }
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

    categoryLoading,
    categoryError,

    fetchCategories,

    addCategory,

    deleteCategory,

    editCategory,
  };
}