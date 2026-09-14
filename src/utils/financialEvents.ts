import type {
  FinancialEvent,
  FinancialEventItem,
} from "@/types/financialEvent";
import { validDate } from "@/utils/expenseMath";

export const financialEventsStorageKey = "expense-tracker-financial-events";
export const financialEventsChangeEvent =
  "expense-tracker-financial-events-change";
const id = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + String(Math.random());
const now = () => new Date().toISOString();
export function newFinancialEventItem(): FinancialEventItem {
  return { id: id(), name: "New item", amount: 0, frequency: "once" };
}
export function newFinancialEvent(currency = "MYR"): FinancialEvent {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: id(),
    name: "New financial event",
    description: "",
    currency,
    kind: "expense",
    startDate: today,
    endDate: today,
    items: [newFinancialEventItem()],
    createdAt: now(),
    updatedAt: now(),
  };
}
export function eventDays(
  event: Pick<FinancialEvent, "startDate" | "endDate">,
) {
  return !validDate(event.startDate) ||
    !validDate(event.endDate) ||
    event.endDate < event.startDate
    ? 0
    : Math.floor(
        (Date.parse(event.endDate) - Date.parse(event.startDate)) / 86400000,
      ) + 1;
}
export function eventTotal(event: FinancialEvent) {
  const days = eventDays(event);
  return (
    Math.round(
      event.items.reduce(
        (total, item) =>
          total +
          (item.frequency === "daily" ? item.amount * days : item.amount),
        0,
      ) * 100,
    ) / 100
  );
}
export function eventImpact(event: FinancialEvent) {
  return event.kind === "income" ? eventTotal(event) : -eventTotal(event);
}
function isEvent(value: unknown): value is FinancialEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as FinancialEvent;
  return (
    typeof event.id === "string" &&
    typeof event.name === "string" &&
    /^[A-Z]{3}$/.test(event.currency) &&
    ["income", "expense"].includes(event.kind) &&
    validDate(event.startDate) &&
    validDate(event.endDate) &&
    event.endDate >= event.startDate &&
    Array.isArray(event.items) &&
    event.items.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        Number.isFinite(item.amount) &&
        item.amount >= 0 &&
        item.amount <= 1e12 &&
        ["once", "daily"].includes(item.frequency),
    )
  );
}
export function parseFinancialEvents(raw: string): FinancialEvent[] {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(isEvent))
    throw new Error(
      "Saved events could not be read. Existing data has been preserved.",
    );
  return value;
}
