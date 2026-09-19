"use client";

import { Bell, BellRing, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn, toneStyles } from "@/components/ui/styles";
import { sendTelegramMessage } from "@/services/telegramService";
import { dateKey } from "@/utils/expenseMath";
import { buildExpenseReminderMessage } from "@/utils/expenseReminderMessage";
import {
  clearExpenseReminderSent,
  normalizeExpenseReminderSettings,
  saveExpenseReminderSettings,
  type ExpenseReminderSettings,
} from "@/utils/expenseReminderSettings";

export default function ExpenseReminderPanel({
  settings,
  lastSent,
  todaysExpenseCount,
  onChange,
  onTest,
  onToast,
}: {
  settings: ExpenseReminderSettings;
  lastSent: string;
  todaysExpenseCount: number;
  onChange: (settings: ExpenseReminderSettings) => void;
  onTest: () => void;
  onToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}) {
  const safeSettings = normalizeExpenseReminderSettings(settings);
  const today = dateKey();
  const alreadySentToday = lastSent === today;
  const notificationSupported =
    typeof window !== "undefined" && "Notification" in window;
  const notificationPermission = notificationSupported
    ? Notification.permission
    : "denied";

  function update(next: ExpenseReminderSettings) {
    const normalized = normalizeExpenseReminderSettings(next);
    saveExpenseReminderSettings(normalized);
    onChange(normalized);
  }

  async function enableBrowserNotification(checked: boolean) {
    if (!checked) {
      update({ ...safeSettings, browserNotification: false });
      return;
    }

    if (!notificationSupported) {
      update({ ...safeSettings, browserNotification: false });
      return;
    }

    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;

    update({ ...safeSettings, browserNotification: permission === "granted" });
  }

  async function testTelegram() {
    try {
      await sendTelegramMessage(
        safeSettings.telegramChatId,
        buildExpenseReminderMessage(),
      );
      onToast("Telegram test message sent.", "success");
    } catch (cause) {
      onToast(
        cause instanceof Error ? cause.message : "Telegram test failed.",
        "error",
      );
    }
  }

  return (
    <div className="space-y-4">
      <section
        className={cn(
          "rounded-2xl border p-4",
          todaysExpenseCount > 0
            ? toneStyles.success.subtleSurface
            : toneStyles.warning.subtleSurface,
        )}
      >
        <div className="flex items-center gap-3">
          {todaysExpenseCount > 0 ? (
            <BellRing className="size-5 text-emerald-300" aria-hidden />
          ) : (
            <Bell className="size-5 text-amber-300" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="font-semibold">
              {todaysExpenseCount > 0
                ? `${todaysExpenseCount} expense recorded today`
                : "No expense recorded today"}
            </p>
            <p className="text-sm text-zinc-400">
              {safeSettings.enabled
                ? `Reminder time: ${safeSettings.time}`
                : "Reminder is off"}
            </p>
          </div>
        </div>
      </section>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
        <span>
          <span className="block font-semibold">Forgotten entry reminder</span>
          <span className="block text-sm text-zinc-400">
            Check once per day when the app is open.
          </span>
        </span>
        <input
          aria-label="Enable forgotten entry reminder"
          checked={safeSettings.enabled}
          className="size-5 accent-emerald-400"
          type="checkbox"
          onChange={(event) =>
            update({ ...safeSettings, enabled: event.currentTarget.checked })
          }
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-zinc-300">Remind after</span>
        <Input
          aria-label="Reminder time"
          type="time"
          value={safeSettings.time}
          onChange={(event) =>
            update({ ...safeSettings, time: event.currentTarget.value })
          }
        />
      </label>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
        <span>
          <span className="block font-semibold">Browser notification</span>
          <span className="block text-sm text-zinc-400">
            {notificationSupported
              ? notificationPermission === "denied"
                ? "Blocked by browser settings"
                : "Show a system notification too."
              : "Not supported in this browser."}
          </span>
        </span>
        <input
          aria-label="Enable browser notification"
          checked={
            safeSettings.browserNotification && notificationPermission === "granted"
          }
          className="size-5 accent-emerald-400"
          disabled={!notificationSupported || notificationPermission === "denied"}
          type="checkbox"
          onChange={(event) =>
            void enableBrowserNotification(event.currentTarget.checked)
          }
        />
      </label>

      <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4">
        <span>
          <span className="block font-semibold">Telegram message</span>
          <span className="block text-sm text-zinc-400">
            Send the reminder through your bot.
          </span>
        </span>
        <input
          aria-label="Enable Telegram reminder"
          checked={safeSettings.telegramEnabled}
          className="size-5 accent-emerald-400"
          type="checkbox"
          onChange={(event) =>
            update({
              ...safeSettings,
              telegramEnabled: event.currentTarget.checked,
            })
          }
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-zinc-300">
          Telegram chat ID
        </span>
        <Input
          aria-label="Telegram chat ID"
          inputMode="text"
          placeholder="123456789 or -100..."
          value={safeSettings.telegramChatId}
          onChange={(event) =>
            update({ ...safeSettings, telegramChatId: event.currentTarget.value })
          }
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onTest}>
          Test reminder
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!safeSettings.telegramChatId.trim()}
          onClick={() => void testTelegram()}
        >
          Test Telegram
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="ghost"
          className="col-span-2"
          onClick={() => {
            clearExpenseReminderSent();
            onChange(safeSettings);
          }}
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset today
        </Button>
      </div>

      {alreadySentToday && (
        <p className="text-sm text-zinc-400" role="status">
          Reminder already sent today.
        </p>
      )}
    </div>
  );
}
