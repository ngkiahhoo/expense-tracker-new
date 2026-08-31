import type { Currency } from "@/types/currency";

export type TransactionChangeType =
  | "expense"
  | "income";

interface TransactionChangedDetail {
  currency?:Currency;
  month:string;
  type:TransactionChangeType;
}

export function notifyTransactionsChanged(
  detail:TransactionChangedDetail
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("transactions:changed", {
      detail,
    })
  );
}
