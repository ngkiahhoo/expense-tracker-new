import { Card } from "@/components/ui/Card";
import { toneStyles } from "@/components/ui/styles";

interface SpendingAnalytics {
  needs: number;
  commitment: number;
  wants: number;
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
      color: toneStyles.needs.chart,
    },
    {
      key: "commitment",
      label: "Commitment",
      value: analytics.commitment,
      color: toneStyles.commitment.chart,
    },
    {
      key: "wants",
      label: "Wants",
      value: analytics.wants,
      color: toneStyles.wants.chart,
    },
  ];

  return (

    <Card variant="item" padding="lg">

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

    </Card>
  );
}
