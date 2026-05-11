"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import {
  Plus,
  Trash2,
  Pencil,
  X,
  FolderCog,
} from "lucide-react";

export default function Home() {
  const [expenses, setExpenses] =
    useState<any[]>([]);

  const [categories, setCategories] =
    useState<any[]>([]);

  const [amount, setAmount] =
    useState("");

  const [note, setNote] =
    useState("");

  const [expenseDate, setExpenseDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [selectedMonth, setSelectedMonth] =
    useState(
      `${new Date().getFullYear()}-${String(
        new Date().getMonth() + 1
      ).padStart(2, "0")}`
    );

}