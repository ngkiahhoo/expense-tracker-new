"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import LoadState from "@/components/ui/LoadState";
import { cn, toneStyles } from "@/components/ui/styles";
import { getReminderLogs } from "@/services/reminderLogService";
import type { ReminderLog } from "@/types/reminderLog";

const formatter = new Intl.DateTimeFormat("en-MY", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kuala_Lumpur",
});

function statusClass(status: ReminderLog["status"]) {
  if (status === "sent") return toneStyles.success.subtleSurface;
  if (status === "error") return toneStyles.danger.subtleSurface;
  return toneStyles.neutral.subtleSurface;
}

export default function ReminderLogsPanel() {
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(showSpinner = true) {
    if (showSpinner) {
      setLoading(true);
      setError("");
    }
    try {
      setLogs(await getReminderLogs());
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load reminder logs.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => void load(false), 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">Last 30 reminder runs</p>
        </div>
        <Button
          aria-label="Refresh reminder logs"
          size="icon"
          type="button"
          variant="outline"
          onClick={() => void load()}
        >
          <RefreshCw className="size-4" aria-hidden />
        </Button>
      </div>

      <LoadState loading={loading} error={error} retry={() => void load()} />

      {!loading && !error && logs.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
          No reminder logs yet.
        </p>
      )}

      <div className="space-y-2">
        {logs.map((log) => (
          <article
            key={log.id}
            className={cn("rounded-2xl border p-4", statusClass(log.status))}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold capitalize">
                  {log.status} by {log.source}
                </p>
                <p className="text-sm text-zinc-400">
                  {formatter.format(new Date(log.created_at))}
                </p>
              </div>
              {log.reminder_date && (
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-xs text-zinc-300">
                  {log.reminder_date}
                </span>
              )}
            </div>

            {log.expense_count !== null && (
              <p className="mt-2 text-sm text-zinc-300">
                Expenses today: {log.expense_count}
              </p>
            )}

            {log.error && (
              <p className="mt-2 break-words text-sm text-red-200">
                {log.error}
              </p>
            )}

            {log.message && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-300">
                {log.message}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
