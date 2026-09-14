import { supabase } from "@/lib/supabase";

export async function createSupabaseBackup() {
  const { data, error } = await supabase.rpc("export_app_backup");
  if (error) throw new Error(`Could not export all Supabase tables: ${error.message}`);
  if (!data || typeof data !== "object" || !("restore_sql" in data) || typeof data.restore_sql !== "string")
    throw new Error("Supabase returned an invalid SQL backup.");
  return data.restore_sql;
}

export function downloadSupabaseBackup(payload: string) {
  const blob = new Blob([payload], { type: "application/sql" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.sql`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
