"use client";

import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";

import type { CategoryBreakdownItem } from "../../../types/analytics";

interface ExpenseCategoryBreakdownProps {
  breakdown: CategoryBreakdownItem[];
  loading: boolean;
  onSelectCategory: (
    item: CategoryBreakdownItem
  ) => void;
}

function renderTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0].payload as CategoryBreakdownItem;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 text-sm text-white shadow-xl">
      <p className="font-bold mb-1">{item.categoryName}</p>
      <p className="text-zinc-400">RM {item.totalAmount.toFixed(2)}</p>
      <p className="text-zinc-400">{item.percentage}%</p>
    </div>
  );
}

export default function ExpenseCategoryBreakdown({
  breakdown,
  loading,
  onSelectCategory,
}: ExpenseCategoryBreakdownProps) {
  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded-full bg-zinc-800" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-48 rounded-3xl bg-zinc-800" />
            <div className="space-y-3">
              <div className="h-12 rounded-2xl bg-zinc-800" />
              <div className="h-12 rounded-2xl bg-zinc-800" />
              <div className="h-12 rounded-2xl bg-zinc-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-sm text-zinc-400 uppercase tracking-[0.2em]">
            Expense Category Breakdown
          </p>
          <h2 className="text-2xl font-bold">Category distribution</h2>
        </div>
      </div>

      {breakdown.length === 0 ? (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 text-center text-zinc-400">
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
                    if (data?.payload) {
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
                onClick={() => onSelectCategory(item)}
                className="w-full rounded-3xl border border-zinc-800 bg-zinc-950 p-4 text-left transition hover:border-white"
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
                    RM {item.totalAmount.toFixed(2)}
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
  );
}
