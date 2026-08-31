"use client";

import { Card } from "@/components/ui/Card";
import CollapsibleHeader from "@/components/ui/CollapsibleHeader";
import type { MonthlySeriesItem } from "@/hooks/useMonthlySeries";
import { formatCurrencyAmount } from "@/utils/currency";

interface MonthlyTrendCardsProps {
  currency?:string;
  isOpen:boolean;
  monthlySeries:MonthlySeriesItem[];
  onSelectMonthExpense?:(monthKey:string) => void;
  onToggle:() => void;
}

const summaryCards = [
  {
    title: "Income",
    colorClass: "bg-emerald-500",
    textClass: "text-emerald-400",
    valueKey: "income" as const,
  },
  {
    title: "Expense",
    colorClass: "bg-rose-500",
    textClass: "text-rose-400",
    valueKey: "expense" as const,
  },
  {
    title: "Balance",
    colorClass: "bg-sky-500",
    textClass: "text-sky-400",
    valueKey: "balance" as const,
  },
];

export default function MonthlyTrendCards({
  currency,
  isOpen,
  monthlySeries,
  onSelectMonthExpense,
  onToggle,
}:MonthlyTrendCardsProps) {
  const trendItems = [...monthlySeries].reverse();

  return (
    <Card variant="default" padding="lg">
      <CollapsibleHeader
        title="Monthly Trends"
        isOpen={isOpen}
        onToggle={onToggle}
      />

      {isOpen && (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {summaryCards.map((card) => {
            const startIndex = trendItems.findIndex(
              (item) => Math.abs(item[card.valueKey]) > 0
            );
            const visibleItems = startIndex >= 0
              ? trendItems.slice(startIndex)
              : [];

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${card.colorClass}`} />
                  <h4 className={`text-sm font-semibold ${card.textClass}`}>
                    {card.title}
                  </h4>
                </div>

                {visibleItems.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
                    No data yet
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {visibleItems.map((item) => {
                      const value = item[card.valueKey];
                      const referenceValue = item.income > 0
                        ? item.income
                        : 1;
                      const normalizedWidth =
                        card.valueKey === "income"
                          ? 100
                          : Math.min(100, Math.max(8, (Math.abs(value) / referenceValue) * 100));
                      const isExpenseRow = card.valueKey === "expense";

                      return (
                        <button
                          key={`${card.title}-${item.label}`}
                          type="button"
                          onClick={() => {
                            if (isExpenseRow && onSelectMonthExpense) {
                              onSelectMonthExpense(item.monthKey);
                            }
                          }}
                          className={`w-full rounded-xl border border-zinc-800/70 bg-zinc-900/60 px-3 py-2 text-left transition ${isExpenseRow ? "cursor-pointer hover:border-white" : "cursor-default"}`}
                        >
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-zinc-400">
                              {item.label}
                            </span>
                            <span className={`font-semibold ${card.textClass}`}>
                              {formatCurrencyAmount(value, currency)}
                            </span>
                          </div>

                          {card.valueKey !== "income" && (
                            <div className="mt-2 h-2 rounded-full bg-zinc-800">
                              <div
                                className={`h-2 rounded-full ${card.colorClass}`}
                                style={{ width: `${normalizedWidth}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
