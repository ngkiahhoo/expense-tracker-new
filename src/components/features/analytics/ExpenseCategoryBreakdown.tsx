"use client";

import { useState } from "react";

import CategoryDistributionCard from "@/components/features/analytics/CategoryDistributionCard";
import MonthlyTrendCards from "@/components/features/analytics/MonthlyTrendCards";
import { Card } from "@/components/ui/Card";
import type { MonthlySeriesItem } from "@/hooks/useMonthlySeries";
import type { CategoryBreakdownItem } from "@/types/analytics";

interface ExpenseCategoryBreakdownProps {
  breakdown:CategoryBreakdownItem[];
  currency?:string;
  loading:boolean;
  monthlySeries?:MonthlySeriesItem[];
  onSelectCategory?:(item:CategoryBreakdownItem) => void;
  onSelectMonthExpense?:(monthKey:string) => void;
}

export default function ExpenseCategoryBreakdown({
  breakdown,
  currency,
  loading,
  monthlySeries = [],
  onSelectCategory,
  onSelectMonthExpense,
}:ExpenseCategoryBreakdownProps) {
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

  return (
    <div className="space-y-4">
      <CategoryDistributionCard
        breakdown={breakdown}
        isOpen={showCategoryDetails}
        onSelectCategory={onSelectCategory}
        onToggle={() => setShowCategoryDetails((current) => !current)}
      />

      <MonthlyTrendCards
        currency={currency}
        isOpen={showTrendDetails}
        monthlySeries={monthlySeries}
        onSelectMonthExpense={onSelectMonthExpense}
        onToggle={() => setShowTrendDetails((current) => !current)}
      />
    </div>
  );
}
