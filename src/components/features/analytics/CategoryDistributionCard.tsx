"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Card } from "@/components/ui/Card";
import CollapsibleHeader from "@/components/ui/CollapsibleHeader";
import { emptyStateStyles } from "@/components/ui/styles";
import type { CategoryBreakdownItem } from "@/types/analytics";
import { formatCurrencyAmount } from "@/utils/currency";

interface CategoryDistributionCardProps {
  breakdown:CategoryBreakdownItem[];
  isOpen:boolean;
  onSelectCategory?:(item:CategoryBreakdownItem) => void;
  onToggle:() => void;
}

function renderTooltip(props:unknown) {
  const { active, payload } = props as {
    active?:boolean;
    payload?:Array<{ payload?:CategoryBreakdownItem }>;
  };

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0].payload;

  if (!item) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white shadow-xl">
      <p className="mb-1 font-bold">
        {item.categoryName}
      </p>
      <p className="text-zinc-400">
        {formatCurrencyAmount(item.totalAmount, item.expenses[0]?.currency)}
      </p>
      <p className="text-zinc-400">
        {item.percentage}%
      </p>
    </div>
  );
}

export default function CategoryDistributionCard({
  breakdown,
  isOpen,
  onSelectCategory,
  onToggle,
}:CategoryDistributionCardProps) {
  return (
    <Card variant="default" padding="lg">
      <CollapsibleHeader
        title="Category distribution"
        isOpen={isOpen}
        onToggle={onToggle}
      />

      {isOpen && (
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
                        style={{ backgroundColor: item.color }}
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
  );
}
