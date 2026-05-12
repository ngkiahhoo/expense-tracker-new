export default function AnalyticsPanel({
  analytics,
  totalSpending,
}: any) {

  function percent(value:number) {

    if (totalSpending <= 0)
      return "0.0";

    return (
      (value / totalSpending) * 100
    ).toFixed(1);
  }

  return (

    <div
      className="
        bg-zinc-900
        rounded-3xl
        p-5
        mb-5
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

        {/* NEEDS */}

        <div>

          <div
            className="
              flex
              justify-between
              mb-2
            "
          >

            <span>
              Needs
            </span>

            <span>
              {percent(
                analytics.needs
              )}
              %
              {" · "}
              RM
              {" "}
              {analytics.needs.toFixed(2)}
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
                bg-white
              "
              style={{
                width:
                  `${percent(
                    analytics.needs
                  )}%`
              }}
            />

          </div>

        </div>

        {/* WANTS */}

        <div>

          <div
            className="
              flex
              justify-between
              mb-2
            "
          >

            <span>
              Wants
            </span>

            <span>
              {percent(
                analytics.wants
              )}
              %
              {" · "}
              RM
              {" "}
              {analytics.wants.toFixed(2)}
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
                bg-white
              "
              style={{
                width:
                  `${percent(
                    analytics.wants
                  )}%`
              }}
            />

          </div>

        </div>

        {/* SAVINGS */}

        <div>

          <div
            className="
              flex
              justify-between
              mb-2
            "
          >

            <span>
              Savings
            </span>

            <span>
              {percent(
                analytics.savings
              )}
              %
              {" · "}
              RM
              {" "}
              {analytics.savings.toFixed(2)}
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
                bg-white
              "
              style={{
                width:
                  `${percent(
                    analytics.savings
                  )}%`
              }}
            />

          </div>

        </div>

      </div>

    </div>
  );
}