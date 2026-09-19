import { supabase } from "@/lib/supabase";
import type { ReminderLog, ReminderLogPayload } from "@/types/reminderLog";

export async function getReminderLogs(limit = 30) {
  const { data, error } = await supabase
    .from("reminder_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ReminderLog[];
}

export async function createReminderLog(payload: ReminderLogPayload) {
  const { error } = await supabase.from("reminder_logs").insert([payload]);
  if (error) throw error;
}
