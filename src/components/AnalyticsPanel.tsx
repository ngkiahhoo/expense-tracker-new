interface SpendingAnalytics {
  needs: number;
  wants: number;
  savings: number;
}

export default function AnalyticsPanel({
  analytics,
  totalSpending,
  totalIncome,
}: {
  analytics: SpendingAnalytics;
  totalSpending: number;
  totalIncome: number;
}) {

  function percent(value: number) {

    if (totalIncome <= 0) {
      return "0.0";
    }

    return (
      (value / totalIncome) * 100
    ).toFixed(1);
  }

  const rows = [
    {
      key: "needs",
      label: "Needs",
      value: analytics.needs,
      color: "#ef4444", // red
    },
    {
      key: "wants",
      label: "Wants",
      value: analytics.wants,
      color: "#3b82f6", // blue
    },
    {
      key: "savings",
      label: "Savings",
      value: analytics.savings,
      color: "#06b6d4", // cyan
    },
  ];

  return (

    <div
      className="
        bg-zinc-900
        border-2
        border-zinc-700
        rounded-3xl
        p-5
        sm:p-6
      "
    >

      <h2
        className="
          text-2xl
          font-bold
          mb-5
        "
      >
        Spending Breakdown
      </h2>

      <div
        className="
          grid
          gap-5
          md:grid-cols-3
        "
      >

        {rows.map((row) => (

          <div key={row.key}>

            <div
              className="
                flex
                justify-between
                gap-3
                mb-2
                text-sm
              "
            >

              <span>
                {row.label}
              </span>

              <span
                className="
                  text-right
                  text-zinc-300
                "
              >
                {percent(row.value)}% - RM {row.value.toFixed(2)}
              </span>

            </div>

            <div
              className="
                h-3
                bg-zinc-800
                rounded-full
                overflow-hidden
              "
            >

              <div
                className="
                  h-full
                  rounded-full
                  transition-all
                  duration-300
                "
                style={{
                  width: `${percent(row.value)}%`,
                  backgroundColor: row.color,
                  minWidth:
                    row.value > 0 ? "2px" : undefined,
                }}
              />

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}
