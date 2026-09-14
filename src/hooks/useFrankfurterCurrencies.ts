"use client";

import { useEffect, useMemo, useState } from "react";

export interface FrankfurterCurrency {
  code: string;
  name: string;
  symbol: string;
}

let cachedCurrencies: FrankfurterCurrency[] | null = null;
let pendingCurrencies: Promise<FrankfurterCurrency[]> | null = null;

async function loadCurrencies() {
  if (cachedCurrencies) return cachedCurrencies;
  if (!pendingCurrencies) {
    pendingCurrencies = fetch("https://api.frankfurter.dev/v2/currencies")
      .then(async (response) => {
        if (!response.ok) throw new Error("Currency list is unavailable.");
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("Currency list is invalid.");
        const currencies = data
          .flatMap((item): FrankfurterCurrency[] => {
            if (typeof item !== "object" || item === null) return [];
            const value = item as Record<string, unknown>;
            const code = typeof value.iso_code === "string" ? value.iso_code : "";
            const name = typeof value.name === "string" ? value.name : "";
            const symbol = typeof value.symbol === "string" ? value.symbol : "";
            return /^[A-Z]{3}$/.test(code) && name ? [{ code, name, symbol }] : [];
          })
          .sort((a, b) => a.code.localeCompare(b.code));
        cachedCurrencies = currencies;
        return currencies;
      })
      .finally(() => {
        pendingCurrencies = null;
      });
  }
  return pendingCurrencies;
}

export default function useFrankfurterCurrencies(query: string) {
  const [currencies, setCurrencies] = useState<FrankfurterCurrency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const term = query.trim().toLowerCase();

  useEffect(() => {
    if (!term) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void loadCurrencies().then((value) => {
        if (active) {
          setCurrencies(value);
          setError("");
        }
      }).catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Currency list is unavailable.");
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [term]);

  const matches = useMemo(() => term ? currencies.filter((currency) => currency.code.toLowerCase().includes(term) || currency.name.toLowerCase().includes(term)).slice(0, 8) : [], [currencies, term]);
  return { matches, loading, error };
}
