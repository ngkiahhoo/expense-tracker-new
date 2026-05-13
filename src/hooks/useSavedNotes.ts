"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

export interface SavedNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY =
  "expense-tracker-saved-notes";

function normalizeNote(
  content: string
) {
  return content
    .trim()
    .replace(/\s+/g, " ");
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}`;
}

export default function useSavedNotes() {
  const [savedNotes, setSavedNotes] =
    useState<SavedNote[]>(() => {
      if (typeof window === "undefined") {
        return [];
      }

      const stored =
        window.localStorage.getItem(
          STORAGE_KEY
        );

      if (!stored) {
        return [];
      }

      try {
        const parsed =
          JSON.parse(stored) as SavedNote[];

        return Array.isArray(parsed)
          ? parsed
          : [];
      } catch {
        return [];
      }
    });

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(savedNotes)
    );
  }, [savedNotes]);

  const addSavedNote =
    useCallback((content: string) => {
      const normalized =
        normalizeNote(content);

      if (!normalized) {
        return;
      }

      setSavedNotes((current) => {
        const exists =
          current.some(
            (item) =>
              item.content.toLowerCase() ===
              normalized.toLowerCase()
          );

        if (exists) {
          return current;
        }

        const now =
          new Date().toISOString();

        return [
          {
            id: createId(),
            content: normalized,
            createdAt: now,
            updatedAt: now,
          },
          ...current,
        ];
      });
    }, []);

  const updateSavedNote =
    useCallback(
      (
        id: string,
        content: string
      ) => {
        const normalized =
          normalizeNote(content);

        if (!normalized) {
          return;
        }

        setSavedNotes((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  content: normalized,
                  updatedAt:
                    new Date().toISOString(),
                }
              : item
          )
        );
      },
      []
    );

  const deleteSavedNote =
    useCallback((id: string) => {
      setSavedNotes((current) =>
        current.filter(
          (item) => item.id !== id
        )
      );
    }, []);

  return {
    savedNotes,
    addSavedNote,
    updateSavedNote,
    deleteSavedNote,
  };
}
