"use client";

import {
  CalendarDays,
  Wallet,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import type { Currency } from "@/types/currency";
import {
  CURRENCIES,
  currencyLabel,
  formatCurrencyAmount,
} from "@/utils/currency";

interface DashboardSummarySectionProps {
  activeCurrency:Currency;
  assetCount:number;
  assetTotal:number;
  currentMonth:string;
  months:string[];
  onAssetClick:() => void;
  onCurrencyChange:(currency:string) => void;
  onMonthChange:(month:string) => void;
  selectedMonth:string;
  loading?: boolean;
  error?: boolean;
}

export default function DashboardSummarySection({
  activeCurrency,
  assetCount,
  assetTotal,
  currentMonth,
  months,
  onAssetClick,
  onCurrencyChange,
  onMonthChange,
  selectedMonth,
  loading, error,
}:DashboardSummarySectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card
        className="cursor-pointer text-left"
        variant="info"
        onClick={onAssetClick}
        role="button"
        tabIndex={0}
        aria-label="View Total Assets details"
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAssetClick(); } }}
      >
        <div>
          <div className="mb-3 flex items-center gap-2 text-zinc-400">
            <Wallet size={18} />
            Total Assets
          </div>

          <div className="space-y-2">
            <div className="block w-full rounded-xl border border-cyan-500/20 bg-black/30 px-3 py-3 text-left transition hover:border-cyan-300">
              <div className="text-2xl font-bold text-cyan-400">
                {error ? "Unavailable" : loading ? "Loading..." : formatCurrencyAmount(assetTotal, activeCurrency)}
              </div>
            </div>
          </div>

          <p className="mt-2 text-sm text-zinc-400">
            {!loading && !error && <>{assetCount} record{assetCount === 1 ? "" : "s"}</>}
          </p>
        </div>
      </Card>

      <Card
        variant="panel"
        padding="none"
        className="flex h-full min-h-[132px] flex-col p-4 sm:p-5 md:min-h-[150px]"
      >
        <div className="flex items-center gap-2 text-zinc-400">
          <CalendarDays size={18} />
          <span>View Month</span>
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_96px] gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Select
            aria-label="View month"
            value={selectedMonth}
            onChange={(event) => onMonthChange(event.target.value)}
            className="w-full text-base sm:text-lg"
          >
            {months.map((month) => (
              <option
                key={month}
                value={month}
                className="bg-black"
              >
                {month === currentMonth ? `${month} (Current)` : month}
              </option>
            ))}
          </Select>

          <Select
            value={activeCurrency}
            aria-label="Dashboard currency"
            onChange={(event) => onCurrencyChange(event.target.value)}
            className="w-full text-base sm:text-lg"
            title="Currency for new records and current dashboard"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currencyLabel(currency)}
              </option>
            ))}
          </Select>
        </div>
      </Card>
    </div>
  );
}
