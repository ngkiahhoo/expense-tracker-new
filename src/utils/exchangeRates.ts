const cacheKey = "expense-tracker-frankfurter-rates";
type Cache = Record<string, { rate: number; date: string }>;
const pending = new Map<string, Promise<number>>();
const today = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return [value("year"), value("month"), value("day")].join("-");
};
export async function getDailyExchangeRate(base: string, quote: string) {
  if (base === quote) return 1;
  const key = base.toUpperCase() + ":" + quote.toUpperCase();
  let cache: Cache = {};
  try {
    cache = JSON.parse(window.localStorage.getItem(cacheKey) || "{}") as Cache;
  } catch {}
  if (cache[key]?.date === today() && Number.isFinite(cache[key].rate))
    return cache[key].rate;
  const currentRequest = pending.get(key);
  if (currentRequest) return currentRequest;
  const request = (async () => {
    const response = await fetch(
      "https://api.frankfurter.dev/v2/rate/" +
        encodeURIComponent(base.toLowerCase()) +
        "/" +
        encodeURIComponent(quote.toLowerCase()),
    );
    if (!response.ok)
      throw new Error("Exchange rate unavailable for " + key + ".");
    const data: unknown = await response.json();
    const rate =
      typeof data === "object" && data !== null && "rate" in data
        ? Number((data as { rate: unknown }).rate)
        : NaN;
    if (!Number.isFinite(rate) || rate <= 0)
      throw new Error("Invalid exchange rate for " + key + ".");
    cache[key] = { rate, date: today() };
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch {}
    return rate;
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    pending.delete(key);
  }
}
