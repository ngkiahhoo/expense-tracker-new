export type ReminderLogStatus = "sent" | "skipped" | "error";
export type ReminderLogSource = "cron" | "manual";

export type ReminderLog = {
  id: number;
  created_at: string;
  reminder_date: string | null;
  source: ReminderLogSource | string;
  status: ReminderLogStatus;
  message: string | null;
  expense_count: number | null;
  error: string | null;
};

export type ReminderLogPayload = {
  reminder_date?: string | null;
  source: ReminderLogSource | string;
  status: ReminderLogStatus;
  message?: string | null;
  expense_count?: number | null;
  error?: string | null;
};
