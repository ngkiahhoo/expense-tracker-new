import { dateKey } from "./expenseMath";

export type ExpenseReminderSettings = {
  enabled: boolean;
  time: string;
  browserNotification: boolean;
  telegramEnabled: boolean;
  telegramChatId: string;
};

export const expenseReminderSettingsKey = "expense-reminder:settings";
export const expenseReminderLastSentKey = "expense-reminder:last-sent";
export const expenseReminderSettingsChanged = "expense-reminder:settings-changed";

export const defaultExpenseReminderSettings: ExpenseReminderSettings = {
  enabled: false,
  time: "21:00",
  browserNotification: false,
  telegramEnabled: false,
  telegramChatId: "",
};

export function normalizeExpenseReminderSettings(
  settings: Partial<ExpenseReminderSettings> | null | undefined,
): ExpenseReminderSettings {
  return {
    enabled: settings?.enabled ?? defaultExpenseReminderSettings.enabled,
    time: validReminderTime(settings?.time)
      ? settings.time
      : defaultExpenseReminderSettings.time,
    browserNotification:
      settings?.browserNotification ??
      defaultExpenseReminderSettings.browserNotification,
    telegramEnabled:
      settings?.telegramEnabled ??
      defaultExpenseReminderSettings.telegramEnabled,
    telegramChatId:
      typeof settings?.telegramChatId === "string"
        ? settings.telegramChatId
        : defaultExpenseReminderSettings.telegramChatId,
  };
}

export function readExpenseReminderSettings(): ExpenseReminderSettings {
  if (typeof window === "undefined") return defaultExpenseReminderSettings;

  try {
    const raw = window.localStorage.getItem(expenseReminderSettingsKey);
    if (!raw) return defaultExpenseReminderSettings;

    return normalizeExpenseReminderSettings(
      JSON.parse(raw) as Partial<ExpenseReminderSettings>,
    );
  } catch {
    return defaultExpenseReminderSettings;
  }
}

export function saveExpenseReminderSettings(settings: ExpenseReminderSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    expenseReminderSettingsKey,
    JSON.stringify(settings),
  );
  window.dispatchEvent(new Event(expenseReminderSettingsChanged));
}

export function readExpenseReminderLastSent() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(expenseReminderLastSentKey) || "";
  } catch {
    return "";
  }
}

export function markExpenseReminderSent(today = dateKey()) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(expenseReminderLastSentKey, today);
}

export function clearExpenseReminderSent() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(expenseReminderLastSentKey);
  window.dispatchEvent(new Event(expenseReminderSettingsChanged));
}

export function validReminderTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
