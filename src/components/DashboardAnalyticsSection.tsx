"use client";

import { ChartPie } from "lucide-react";

import AnalyticsPanel from "@/components/AnalyticsPanel";
import ExpenseCategoryBreakdown from "@/components/features/analytics/ExpenseCategoryBreakdown";
import { Button } from "@/components/ui/Button";
import type { CategoryBreakdownItem } from "@/types/analytics";
import type { Currency } from "@/types/currency";
import type { MonthlySeriesItem } from "@/hooks/useMonthlySeries";

interface AnalyticsTotals {
  commitment:number;
  needs:number;
  wants:number;
}

interface DashboardAnalyticsSectionProps {
  analytics:AnalyticsTotals;
  breakdown:CategoryBreakdownItem[];
  currency:Currency;
  exportCopied:boolean;
  exportError:string | null;
  exportLoading:boolean;
  loading:boolean;
  monthlySeries:MonthlySeriesItem[];
  onCopyAIExport:() => void;
  onSelectCategory:(item:CategoryBreakdownItem) => void;
  onSelectMonthExpense:(monthKey:string) => void;
  totalIncome:number;
}

export default function DashboardAnalyticsSection({
  analytics,
  breakdown,
  currency,
  exportCopied,
  exportError,
  exportLoading,
  loading,
  monthlySeries,
  onCopyAIExport,
  onSelectCategory,
  onSelectMonthExpense,
  totalIncome,
}:DashboardAnalyticsSectionProps) {
  return (
    <>
      <section className="w-full">
        <div className="mb-3 flex items-center gap-2 px-1 text-zinc-400">
          <ChartPie size={18} />
          <span>Spending Analytics</span>

          <div className="ml-auto flex items-center gap-2">
            {exportError && (
              <span className="hidden max-w-[220px] truncate text-xs text-red-400 sm:inline">
                {exportError}
              </span>
            )}

            <Button
              onClick={onCopyAIExport}
              disabled={exportLoading}
              variant={exportCopied ? "secondary" : "primary"}
              size="sm"
            >
              {exportLoading
                ? "Copying..."
                : exportCopied
                ? "Copied!"
                : "Export for AI"}
            </Button>
          </div>
        </div>

        <AnalyticsPanel
          analytics={analytics}
          totalIncome={totalIncome}
          currency={currency}
        />
      </section>

      <section className="w-full">
        <ExpenseCategoryBreakdown
          breakdown={breakdown}
          loading={loading}
          onSelectCategory={onSelectCategory}
          onSelectMonthExpense={onSelectMonthExpense}
          monthlySeries={monthlySeries}
          currency={currency}
        />
      </section>
    </>
  );
}
