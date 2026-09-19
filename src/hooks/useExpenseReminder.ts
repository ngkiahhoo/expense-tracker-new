"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Expense } from "@/types/expense";
import { sendTelegramMessage } from "@/services/telegramService";
import { dateKey } from "@/utils/expenseMath";
import { buildExpenseReminderMessage } from "@/utils/expenseReminderMessage";
import {
  expenseReminderSettingsChanged,
  markExpenseReminderSent,
  readExpenseReminderLastSent,
  readExpenseReminderSettings,
  type ExpenseReminderSettings,
} from "@/utils/expenseReminderSettings";

type ToastLike = {
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning",
    duration?: number,
    action?: { label: string; onClick: () => void },
  ) => void;
};

export default function useExpenseReminder({
  expenses,
  loading,
  readError,
  onAddExpense,
  toast,
}: {
  expenses: Expense[];
  loading: boolean;
  readError?: unknown;
  onAddExpense: () => void;
  toast: ToastLike;
}) {
  const [settings, setSettings] = useState<ExpenseReminderSettings>(
    readExpenseReminderSettings,
  );
  const [lastSent, setLastSent] = useState(readExpenseReminderLastSent);

  const todaysExpenses = useMemo(() => {
    const today = dateKey();
    return expenses.filter((expense) => expense.expense_date === today);
  }, [expenses]);

  useEffect(() => {
    const refresh = () => {
      setSettings(readExpenseReminderSettings());
      setLastSent(readExpenseReminderLastSent());
    };

    window.addEventListener(expenseReminderSettingsChanged, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(expenseReminderSettingsChanged, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const fireReminder = useCallback(
    async (manual = false) => {
      const today = dateKey();
      if (!manual) {
        markExpenseReminderSent(today);
        setLastSent(today);
      }

      const reminderMessage = buildExpenseReminderMessage(today);

      toast.showToast(reminderMessage, "warning", 8000, {
        label: "Add expense",
        onClick: onAddExpense,
      });

      if (
        settings.browserNotification &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const notification = new Notification("Expense reminder", {
          body: reminderMessage,
        });
        notification.onclick = () => {
          window.focus();
          onAddExpense();
          notification.close();
        };
      }

      if (settings.telegramEnabled) {
        try {
          await sendTelegramMessage(settings.telegramChatId, reminderMessage);
          if (manual) {
            toast.showToast("Telegram reminder sent.", "success");
          }
        } catch (cause) {
          toast.showToast(
            cause instanceof Error ? cause.message : "Telegram reminder failed.",
            "error",
            8000,
          );
        }
      }
    },
    [
      onAddExpense,
      settings.browserNotification,
      settings.telegramChatId,
      settings.telegramEnabled,
      toast,
    ],
  );

  useEffect(() => {
    const checkReminder = () => {
      if (
        !settings.enabled ||
        loading ||
        readError ||
        todaysExpenses.length > 0
      ) {
        return;
      }

      const now = new Date();
      const today = dateKey(now);
      if (lastSent === today) return;

      const [hour, minute] = settings.time.split(":").map(Number);
      const dueAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
      );

      if (now >= dueAt) void fireReminder();
    };

    checkReminder();
    const interval = window.setInterval(checkReminder, 60 * 1000);
    window.addEventListener("focus", checkReminder);
    document.addEventListener("visibilitychange", checkReminder);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkReminder);
      document.removeEventListener("visibilitychange", checkReminder);
    };
  }, [
    fireReminder,
    lastSent,
    loading,
    readError,
    settings.enabled,
    settings.time,
    todaysExpenses.length,
  ]);

  return {
    settings,
    setSettings,
    lastSent,
    todaysExpenseCount: todaysExpenses.length,
    testReminder: () => void fireReminder(true),
  };
}
