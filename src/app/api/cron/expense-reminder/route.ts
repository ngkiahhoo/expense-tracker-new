import { createClient } from "@supabase/supabase-js";

import { buildExpenseReminderMessage } from "@/utils/expenseReminderMessage";
import type { ReminderLogPayload } from "@/types/reminderLog";

export const dynamic = "force-dynamic";

const telegramApiBase = "https://api.telegram.org";
const timeZone = "Asia/Kuala_Lumpur";

function dateKeyInMalaysia(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value || "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}` || header === secret;
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");

  const response = await fetch(`${telegramApiBase}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      disable_web_page_preview: false,
      text,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
  } | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.description || "Telegram message failed.");
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const chatId = process.env.TELEGRAM_REMINDER_CHAT_ID?.trim();
  if (!chatId) {
    return Response.json(
      { ok: false, error: "TELEGRAM_REMINDER_CHAT_ID is not configured." },
      { status: 500 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      { ok: false, error: "Supabase environment is not configured." },
      { status: 500 },
    );
  }

  const today = dateKeyInMalaysia();
  const supabase = createClient(supabaseUrl, supabaseKey);

  async function writeLog(payload: Omit<ReminderLogPayload, "source">) {
    await supabase
      .from("reminder_logs")
      .insert([{ source: "cron", reminder_date: today, ...payload }]);
  }

  const { count, error } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("expense_date", today);

  if (error) {
    await writeLog({
      status: "error",
      error: error.message,
    }).catch(() => null);
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  if ((count || 0) > 0) {
    await writeLog({
      status: "skipped",
      expense_count: count,
      message: "Expense already recorded today.",
    }).catch(() => null);
    return Response.json({ ok: true, sent: false, today, expenseCount: count });
  }

  try {
    const message = buildExpenseReminderMessage(today);
    await sendTelegramMessage(chatId, message);
    await writeLog({
      status: "sent",
      expense_count: 0,
      message,
    }).catch(() => null);
  } catch (cause) {
    await writeLog({
      status: "error",
      expense_count: 0,
      error:
        cause instanceof Error ? cause.message : "Telegram reminder failed.",
    }).catch(() => null);
    return Response.json(
      {
        ok: false,
        error:
          cause instanceof Error ? cause.message : "Telegram reminder failed.",
      },
      { status: 502 },
    );
  }

  return Response.json({ ok: true, sent: true, today, expenseCount: 0 });
}
