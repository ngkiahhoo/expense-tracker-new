"use client";

import {
  useMemo,
} from "react";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import type { Currency } from "../types/currency";
import { DEFAULT_CURRENCY, normalizeCurrency } from "../utils/currency";

type AnalyticsTotals = {
  needs: number;
  commitment: number;
  wants: number;
};

export default function useAnalytics(
  expenses:Expense[],
  incomes:Income[],
  activeCurrency:Currency = DEFAULT_CURRENCY
) {

  const currencyExpenses =
    useMemo(
      () =>
        expenses.filter(
          (item) =>
            normalizeCurrency(item.currency) ===
            activeCurrency
        ),
      [expenses, activeCurrency]
    );

  const currencyIncomes =
    useMemo(
      () =>
        incomes.filter(
          (item) =>
            normalizeCurrency(item.currency) ===
            activeCurrency
        ),
      [incomes, activeCurrency]
    );

  const totalSpending =
    useMemo(() => {

      return currencyExpenses.reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount
          ),
        0
      );

    }, [currencyExpenses]);

  const totalIncome =
    useMemo(() => {

      return currencyIncomes.reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount
          ),
        0
      );

    }, [currencyIncomes]);

  const spendingPercent =
    useMemo(() => {

      if (
        totalIncome <= 0
      ) return "0";

      return (
        (
          totalSpending /
          totalIncome
        ) * 100
      ).toFixed(1);

    }, [
      totalIncome,
      totalSpending,
    ]);

  const analytics =
    useMemo(() => {

      const result:AnalyticsTotals = {

        needs:0,

        commitment:0,

        wants:0,
      };

      currencyExpenses.forEach(
        (expense) => {

          const typeName =
            expense
              .categories
              ?.types
              ?.name
              ?.toLowerCase();

          if (
            typeName ===
            "needs"
          ) {

            result.needs +=
              Number(
                expense.amount
              );

          } else if (
            typeName ===
            "commitment"
          ) {

            result.commitment +=
              Number(
                expense.amount
              );

          } else if (
            typeName ===
            "wants"
          ) {

            result.wants +=
              Number(
                expense.amount
              );
          }
        }
      );

      return result;

    }, [currencyExpenses]);

  return {

    analytics,

    totalSpending,

    totalIncome,

    spendingPercent,
  };
}
