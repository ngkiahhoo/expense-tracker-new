"use client";

import { useMemo } from "react";

export default function useMonthOptions(
  visibleMonths = 24
) {
  return useMemo(() => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    const months = Array.from(
      { length: visibleMonths * 2 + 1 },
      (_, index) => {
        const date = new Date(
          today.getFullYear(),
          today.getMonth() + index - visibleMonths,
          1
        );

        return `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;
      }
    );

    return {
      currentMonth,
      months: [currentMonth, ...months.filter((month) => month !== currentMonth)],
    };
  }, [visibleMonths]);
}
