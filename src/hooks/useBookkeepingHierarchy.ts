"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Category, Type } from "../types/category";

export default function useBookkeepingHierarchy() {
  const [data, setData] = useState<{ types: Type[]; categories: Category[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true, request = 0;
    async function refresh() {
      const current = ++request;
      try {
        const [types, categories] = await Promise.all([
          supabase.from("types").select("id,name").order("id"),
          supabase.from("categories").select("id,name,type_id").order("name"),
        ]);
        if (types.error) throw types.error;
        if (categories.error) throw categories.error;
        const allowedNames = ["Needs", "Wants", "Commitment"];
        const allowedTypes = allowedNames.flatMap(name => (types.data || [])
          .filter(type => type.name.trim().toLowerCase() === name.toLowerCase())
          .map(type => ({ ...type, name })));
        const allowedCategories = (categories.data || []).filter(category => allowedTypes.some(type => type.id === category.type_id));
        if (alive && current === request) { setData({ types: allowedTypes, categories: allowedCategories }); setError(""); }
      } catch {
        if (alive && current === request) setError("Could not load bookkeeping categories. Return to this tab or reload to retry.");
      }
    }
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { alive = false; window.removeEventListener("focus", refresh); };
  }, []);
  return { data, error };
}
