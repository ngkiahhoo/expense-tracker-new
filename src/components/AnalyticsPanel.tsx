interface SpendingAnalytics {
  needs: number;
  wants: number;
  savings: number;
}

export default function AnalyticsPanel({
  analytics,
  totalSpending,
}: {
  analytics: SpendingAnalytics;
  totalSpending: number;
}) {

  function percent(value: number) {

    if (totalSpending <= 0) {
      return "0.0";
    }

    return (
      (value / totalSpending) * 100
    ).toFixed(1);
  }

  const rows = [
    {
      key: "needs",
      label: "Needs",
      value: analytics.needs,
      color: "bg-emerald-400",
    },
    {
      key: "wants",
      label: "Wants",
      value: analytics.wants,
      color: "bg-sky-400",
    },
    {
      key: "savings",
      label: "Savings",
      value: analytics.savings,
      color: "bg-violet-400",
    },
  ];

  return (

    <div
      className="
        bg-zinc-900
        border
        border-zinc-800
        rounded-3xl
        p-5
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

      <div className="space-y-5">

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
                className={`
                  h-full
                  ${row.color}
                `}
                style={{
                  width:
                    `${percent(row.value)}%`,
                }}
              />

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}
