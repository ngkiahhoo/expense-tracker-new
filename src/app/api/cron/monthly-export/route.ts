import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const telegramApiBase = "https://api.telegram.org";
const telegramExportChatId = "1445140992";
const timeZone = "Asia/Kuala_Lumpur";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}` || header === secret;
}

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

async function createSupabaseBackup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment is not configured.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.rpc("export_app_backup");
  if (error) {
    throw new Error(`Could not export all Supabase tables: ${error.message}`);
  }

  if (
    !data ||
    typeof data !== "object" ||
    !("restore_sql" in data) ||
    typeof data.restore_sql !== "string"
  ) {
    throw new Error("Supabase returned an invalid SQL backup.");
  }

  return data.restore_sql;
}

async function sendTelegramDocument(payload: string, fileName: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");

  const formData = new FormData();
  formData.append("chat_id", telegramExportChatId);
  formData.append(
    "caption",
    `Expense tracker monthly backup: ${fileName}`,
  );
  formData.append(
    "document",
    new Blob([payload], { type: "application/sql" }),
    fileName,
  );

  const response = await fetch(`${telegramApiBase}/bot${token}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  const result = (await response.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
  } | null;

  if (!response.ok || !result?.ok) {
    throw new Error(result?.description || "Telegram document send failed.");
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const today = dateKeyInMalaysia();
    const fileName = `expense-tracker-backup-${today}.sql`;
    const payload = await createSupabaseBackup();
    await sendTelegramDocument(payload, fileName);

    return Response.json({
      ok: true,
      chatId: telegramExportChatId,
      fileName,
      sent: true,
    });
  } catch (cause) {
    return Response.json(
      {
        ok: false,
        error:
          cause instanceof Error ? cause.message : "Monthly export failed.",
      },
      { status: 500 },
    );
  }
}
