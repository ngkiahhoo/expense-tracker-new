"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, type CardVariant } from "@/components/ui/Card";
import { cn, toneStyles, type UiTone } from "@/components/ui/styles";
import type { Currency } from "@/types/currency";
import { currencyLabel } from "@/utils/currency";

interface MetricCardProps {
  variant: CardVariant;
  tone: UiTone;
  icon?: LucideIcon;
  label: string;
  amount: number;
  currency: Currency;
  helper?: string;
  action?: ReactNode;
  onAmountClick?: () => void;
}

export default function MetricCard({
  variant,
  tone,
  icon: Icon,
  label,
  amount,
  currency,
  helper,
  action,
  onAmountClick,
}: MetricCardProps) {
  const amountContent = (
    <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
      <span className="text-base text-zinc-400">{currencyLabel(currency)}</span>
      <span>{amount.toFixed(2)}</span>
    </span>
  );

  return (
    <Card
      variant={variant}
      padding="sm"
      className="flex h-full min-h-[124px] w-full flex-col justify-between md:min-h-[140px]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-zinc-400">
            {Icon && <Icon size={18} />}
            <span>{label}</span>
          </div>

          <h2
            className={cn(
              "mt-2 text-3xl font-bold leading-tight",
              toneStyles[tone].text
            )}
          >
            {onAmountClick ? (
              <button
                type="button"
                onClick={onAmountClick}
                className={cn(
                  "-mx-2 rounded-xl px-2 py-1 text-left transition hover:bg-white/5 focus-visible:bg-white/5",
                  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                )}
              >
                {amountContent}
              </button>
            ) : (
              amountContent
            )}
          </h2>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {helper && (
        <p className="mt-1 text-sm text-zinc-400">
          {helper}
        </p>
      )}
    </Card>
  );
}
