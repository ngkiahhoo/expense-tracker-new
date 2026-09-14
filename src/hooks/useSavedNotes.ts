"use client";

import { useCallback } from "react";
import useCloudFeatureWorkspace from "@/hooks/useCloudFeatureWorkspace";

export interface SavedNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const storageKey = "expense-tracker-saved-notes";
const normalizeContent = (content: string) => content.trim().replace(/\s+/g, " ");
const normalize = (value: unknown): SavedNote[] => Array.isArray(value)
  ? value.flatMap((item): SavedNote[] => {
      if (!item || typeof item !== "object") return [];
      const note = item as Record<string, unknown>;
      const content = typeof note.content === "string" ? normalizeContent(note.content) : "";
      return typeof note.id === "string" && content && typeof note.createdAt === "string" && typeof note.updatedAt === "string"
        ? [{ id: note.id, content, createdAt: note.createdAt, updatedAt: note.updatedAt }]
        : [];
    })
  : [];
const isEmpty = (notes: SavedNote[]) => notes.length === 0;
const createId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());

export default function useSavedNotes() {
  const workspace = useCloudFeatureWorkspace<SavedNote[]>({
    key: "saved_notes",
    initial: [],
    normalize,
    legacyKey: storageKey,
    shouldImport: isEmpty,
  });
  const addSavedNote = useCallback((content: string) => {
    const normalized = normalizeContent(content);
    if (!normalized || workspace.value.some(note => note.content.toLowerCase() === normalized.toLowerCase())) return;
    const now = new Date().toISOString();
    workspace.save([{ id: createId(), content: normalized, createdAt: now, updatedAt: now }, ...workspace.value]);
  }, [workspace]);
  const updateSavedNote = useCallback((id: string, content: string) => {
    const normalized = normalizeContent(content);
    if (!normalized) return;
    workspace.save(workspace.value.map(note => note.id === id ? { ...note, content: normalized, updatedAt: new Date().toISOString() } : note));
  }, [workspace]);
  const deleteSavedNote = useCallback((id: string) => workspace.save(workspace.value.filter(note => note.id !== id)), [workspace]);
  return { savedNotes: workspace.value, addSavedNote, updateSavedNote, deleteSavedNote, storageError: workspace.storageError, loading: workspace.loading };
}
