export const uid = () => crypto.randomUUID();
export const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function dateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
export function validDate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s; }
export function addMonths(s: string, n: number) {
  if (!validDate(s) || !Number.isFinite(n)) return "";
  const d = new Date(`${s}T00:00:00Z`); const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
  d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
  return d.toISOString().slice(0, 10);
}
export function nextDay(s: string, delta = 1) { return validDate(s) && Number.isFinite(delta) ? new Date(Date.parse(s) + delta * 86400000).toISOString().slice(0, 10) : ""; }
