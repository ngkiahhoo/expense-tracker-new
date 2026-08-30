"use client";

import { useState } from "react";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import CollapsibleHeader from "@/components/ui/CollapsibleHeader";
import { emptyStateStyles } from "@/components/ui/styles";
import { formatCurrencyAmount } from "../../../utils/currency";

import type { CategoryBreakdownItem } from "../../../types/analytics";

interface MonthlyTrendItem {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
  balance: number;
}

interface ExpenseCategoryBreakdownProps {
  breakdown: CategoryBreakdownItem[];
  loading: boolean;
  onSelectCategory?: (item: CategoryBreakdownItem) => void;
  onSelectMonthExpense?: (monthKey: string) => void;
  monthlySeries?: MonthlyTrendItem[];
  currency?: string;
}

function renderTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0].payload as CategoryBreakdownItem;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white shadow-xl">
      <p className="font-bold mb-1">{item.categoryName}</p>
      <p className="text-zinc-400">{formatCurrencyAmount(item.totalAmount, item.expenses[0]?.currency)}</p>
      <p className="text-zinc-400">{item.percentage}%</p>
    </div>
  );
}

export default function ExpenseCategoryBreakdown({
  breakdown,
  loading,
  onSelectCategory,
  onSelectMonthExpense,
  monthlySeries = [],
  currency,
}: ExpenseCategoryBreakdownProps) {
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);
  const [showTrendDetails, setShowTrendDetails] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card variant="default" padding="lg">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 rounded-full bg-zinc-800" />
            <div className="h-10 w-full rounded-2xl bg-zinc-800" />
          </div>
        </Card>
        <Card variant="default" padding="lg">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-40 rounded-full bg-zinc-800" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-28 rounded-2xl bg-zinc-800" />
              <div className="h-28 rounded-2xl bg-zinc-800" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const trendItems = [...monthlySeries].reverse();
  const summaryCards = [
    {
      title: "Income",
      subtitle: "Recent months",
      colorClass: "bg-emerald-500",
      textClass: "text-emerald-400",
      valueKey: "income" as const,
    },
    {
      title: "Expense",
      subtitle: "Recent months",
      colorClass: "bg-rose-500",
      textClass: "text-rose-400",
      valueKey: "expense" as const,
    },
    {
      title: "Balance",
      subtitle: "Recent months",
      colorClass: "bg-sky-500",
      textClass: "text-sky-400",
      valueKey: "balance" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <Card variant="default" padding="lg">
        <CollapsibleHeader
          title="Category distribution"
          isOpen={showCategoryDetails}
          onToggle={() => setShowCategoryDetails((current) => !current)}
        />

        {showCategoryDetails && (
          <div className="mt-5">
            {breakdown.length === 0 ? (
              <div className={emptyStateStyles}>
                <p className="text-lg font-semibold text-white">
                  No expenses this month
                </p>
                <p className="mt-2 text-sm">
                  Add an expense to see category distribution.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={breakdown}
                        dataKey="totalAmount"
                        nameKey="categoryName"
                        innerRadius={64}
                        outerRadius={100}
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                        onClick={(data) => {
                          if (data?.payload && onSelectCategory) {
                            onSelectCategory(data.payload as CategoryBreakdownItem);
                          }
                        }}
                        labelLine={false}
                      >
                        {breakdown.map((item) => (
                          <Cell
                            key={item.categoryId ?? item.categoryName}
                            fill={item.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={renderTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {breakdown.map((item) => (
                    <button
                      key={item.categoryId ?? item.categoryName}
                      type="button"
                      onClick={() => onSelectCategory?.(item)}
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-left transition hover:border-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-zinc-400">
                          {item.categoryName}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {item.percentage}%
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-base font-bold text-white">
                          {formatCurrencyAmount(item.totalAmount, item.expenses[0]?.currency)}
                        </span>
                        <span
                          className="inline-flex h-3 flex-1 rounded-full"
                          style={{
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card variant="default" padding="lg">
        <CollapsibleHeader
          title="Monthly Trends"
          isOpen={showTrendDetails}
          onToggle={() => setShowTrendDetails((current) => !current)}
        />

        {showTrendDetails && (
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {summaryCards.map((card) => {
              const startIndex = trendItems.findIndex((item) => Math.abs(item[card.valueKey]) > 0);
              const visibleItems = startIndex >= 0 ? trendItems.slice(startIndex) : [];

              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${card.colorClass}`} />
                    <h4 className={`text-sm font-semibold ${card.textClass}`}>{card.title}</h4>
                  </div>

                  {visibleItems.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
                      No data yet
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {visibleItems.map((item) => {
                        const value = item[card.valueKey];
                        const incomeValue = item.income;
                        const referenceValue = incomeValue > 0 ? incomeValue : 1;
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
                              <span className="text-zinc-400">{item.label}</span>
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
    </div>
  );
}
