"use client";

import { useEffect, useState } from "react";
import { getMonthlySummary, type MonthlySummary } from "@/services/monthlySummaryService";
import type { Currency } from "@/types/currency";
import { DEFAULT_CURRENCY } from "@/utils/currency";

const defaultSummary: MonthlySummary = {
  income: 0,
  expense: 0,
  balance: 0,
};

export default function useMonthlySummary(
  selectedMonth: string,
  currency: Currency = DEFAULT_CURRENCY
) {
  const [summary, setSummary] = useState<MonthlySummary>(defaultSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSummary();
  }, [selectedMonth, currency]);

  async function fetchSummary() {
    setLoading(true);
    setError("");
    try {
      const data = await getMonthlySummary(selectedMonth, currency);
      setSummary(data);
    } catch {
      setError("Failed to fetch monthly summary");
      setSummary(defaultSummary);
    } finally {
      setLoading(false);
    }
  }

  return {
    summary,
    loading,
    error,
    fetchSummary,
  };
}
