import type { Currency } from "@/types/currency";

export const DEFAULT_CURRENCY: Currency = "MYR";

export const CURRENCIES: Currency[] = ["MYR", "SGD"];

export function currencyLabel(currency: Currency | string | null | undefined) {
  return currency === "SGD" ? "SGD" : "RM";
}

export function normalizeCurrency(
  currency: Currency | string | null | undefined
): Currency {
  return currency === "SGD" ? "SGD" : DEFAULT_CURRENCY;
}

export function getStoredCurrency(): Currency {
  if (typeof window === "undefined") {
    return DEFAULT_CURRENCY;
  }

  return normalizeCurrency(
    window.localStorage.getItem("expense-tracker-currency")
  );
}

export function formatCurrencyAmount(
  amount: number,
  currency: Currency | string | null | undefined
) {
  return `${currencyLabel(currency)} ${Number(amount || 0).toFixed(2)}`;
}
