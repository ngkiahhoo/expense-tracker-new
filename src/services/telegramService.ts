export async function sendTelegramMessage(chatId: string, text: string) {
  const response = await fetch("/api/telegram/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, text }),
  });

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Telegram message failed.");
  }
}
