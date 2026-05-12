"use client";

import {
  useMemo,
} from "react";

export default function useAnalytics(
  expenses:any[],
  incomes:any[]
) {

  const totalSpending =
    useMemo(() => {

      return expenses.reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount
          ),
        0
      );

    }, [expenses]);

  const totalIncome =
    useMemo(() => {

      return incomes.reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount
          ),
        0
      );

    }, [incomes]);

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

      const result:any = {

        needs:0,

        wants:0,

        savings:0,
      };

      expenses.forEach(
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
            "wants"
          ) {

            result.wants +=
              Number(
                expense.amount
              );

          } else if (
            typeName ===
            "savings"
          ) {

            result.savings +=
              Number(
                expense.amount
              );
          }
        }
      );

      return result;

    }, [expenses]);

  return {

    analytics,

    totalSpending,

    totalIncome,

    spendingPercent,
  };
}