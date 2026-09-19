import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const telegramApiBase = "https://api.telegram.org";

type TelegramSendBody = {
  chatId?: unknown;
  text?: unknown;
};

async function writeManualLog(payload: {
  status: "sent" | "error";
  message?: string | null;
  error?: string | null;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  const supabase = createClient(supabaseUrl, supabaseKey);
  await supabase.from("reminder_logs").insert([{ source: "manual", ...payload }]);
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return Response.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured." },
      { status: 500 },
    );
  }

  let body: TelegramSendBody;
  try {
    body = (await request.json()) as TelegramSendBody;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const chatId = typeof body.chatId === "string" ? body.chatId.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!chatId) {
    return Response.json(
      { ok: false, error: "Telegram chat ID is required." },
      { status: 400 },
    );
  }

  if (!text) {
    return Response.json(
      { ok: false, error: "Message text is required." },
      { status: 400 },
    );
  }

  const response = await fetch(`${telegramApiBase}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
  } | null;

  if (!response.ok || !payload?.ok) {
    await writeManualLog({
      status: "error",
      message: text,
      error: payload?.description || "Telegram message failed.",
    }).catch(() => null);
    return Response.json(
      {
        ok: false,
        error: payload?.description || "Telegram message failed.",
      },
      { status: 502 },
    );
  }

  await writeManualLog({ status: "sent", message: text }).catch(() => null);

  return Response.json({ ok: true });
}
