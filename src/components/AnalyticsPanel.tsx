"use client";

export default function AnalyticsPanel({
  analytics,
  totalSpending,
  totalIncome,
  expenses,
}: any) {

  function typePercent(value: number) {
    if (totalSpending <= 0)
      return 0;

    return (
      (value / totalSpending) *
      100
    ).toFixed(1);
  }

  const savingsRate =
    totalIncome > 0
      ? (
          ((totalIncome -
            totalSpending) /
            totalIncome) *
          100
        ).toFixed(1)
      : "0";

  const dailyAverage =
    totalSpending > 0
      ? (
          totalSpending / 30
        ).toFixed(2)
      : "0";

  const categoryTotals: any = {};

  expenses.forEach((expense: any) => {

    const category =
      expense.categories?.name;

    if (!category) return;

    if (!categoryTotals[category]) {
      categoryTotals[category] = {
        total: 0,
        type:
          expense.categories?.type,
      };
    }

    categoryTotals[category].total +=
      Number(expense.amount);

  });

  const topCategories =
    Object.entries(categoryTotals)
      .sort(
        (a: any, b: any) =>
          b[1].total -
          a[1].total
      )
      .slice(0, 5);

  return (

    <div className="space-y-5 mb-5">

      {/* TYPE BREAKDOWN */}

      <div className="
        bg-zinc-900
        rounded-3xl
        p-5
      ">

        <h2 className="
          text-xl
          font-bold
          mb-5
        ">
          Spending Breakdown
        </h2>

        <div className="space-y-5">

          {/* NEEDS */}

          <div>

            <div className="
              flex
              justify-between
              mb-2
            ">
              <p>Needs</p>

              <p>
                {typePercent(
                  analytics.needs
                )}% • RM {
                  analytics.needs.toFixed(2)
                }
              </p>
            </div>

            <div className="
              h-3
              bg-zinc-800
              rounded-full
              overflow-hidden
            ">
              <div
                className="
                  h-full
                  bg-white
                "
                style={{
                  width:
                    `${typePercent(
                      analytics.needs
                    )}%`,
                }}
              />
            </div>

          </div>

          {/* WANTS */}

          <div>

            <div className="
              flex
              justify-between
              mb-2
            ">
              <p>Wants</p>

              <p>
                {typePercent(
                  analytics.wants
                )}% • RM {
                  analytics.wants.toFixed(2)
                }
              </p>
            </div>

            <div className="
              h-3
              bg-zinc-800
              rounded-full
              overflow-hidden
            ">
              <div
                className="
                  h-full
                  bg-white
                "
                style={{
                  width:
                    `${typePercent(
                      analytics.wants
                    )}%`,
                }}
              />
            </div>

          </div>

          {/* SAVINGS */}

          <div>

            <div className="
              flex
              justify-between
              mb-2
            ">
              <p>Savings</p>

              <p>
                {typePercent(
                  analytics.savings
                )}% • RM {
                  analytics.savings.toFixed(2)
                }
              </p>
            </div>

            <div className="
              h-3
              bg-zinc-800
              rounded-full
              overflow-hidden
            ">
              <div
                className="
                  h-full
                  bg-white
                "
                style={{
                  width:
                    `${typePercent(
                      analytics.savings
                    )}%`,
                }}
              />
            </div>

          </div>

        </div>

      </div>

      {/* INSIGHTS */}

      <div className="
        bg-zinc-900
        rounded-3xl
        p-5
      ">

        <h2 className="
          text-xl
          font-bold
          mb-5
        ">
          Monthly Insights
        </h2>

        <div className="
          space-y-4
          text-sm
        ">

          <div className="
            flex
            justify-between
          ">
            <p>
              Savings Rate
            </p>

            <p>
              {savingsRate}%
            </p>
          </div>

          <div className="
            flex
            justify-between
          ">
            <p>
              Daily Average Spending
            </p>

            <p>
              RM {dailyAverage}
            </p>
          </div>

        </div>

      </div>

      {/* TOP CATEGORIES */}

      <div className="
        bg-zinc-900
        rounded-3xl
        p-5
      ">

        <h2 className="
          text-xl
          font-bold
          mb-5
        ">
          Top Spending Categories
        </h2>

        <div className="space-y-4">

          {topCategories.map(
            ([name, data]: any) => {

              const typeTotal =
                analytics[
                  data.type
                ];

              const percent =
                typeTotal > 0
                  ? (
                      (data.total /
                        typeTotal) *
                      100
                    ).toFixed(1)
                  : "0";

              return (

                <div
                  key={name}
                  className="
                    border
                    border-zinc-800
                    rounded-2xl
                    p-4
                  "
                >

                  <div className="
                    flex
                    justify-between
                    mb-2
                  ">

                    <div>

                      <p className="
                        font-bold
                      ">
                        {name}
                      </p>

                      <p className="
                        text-xs
                        text-zinc-500
                        mt-1
                      ">
                        {
                          data.type
                        }
                      </p>

                    </div>

                    <div className="
                      text-right
                    ">

                      <p className="
                        font-bold
                      ">
                        RM {
                          data.total.toFixed(
                            2
                          )
                        }
                      </p>

                      <p className="
                        text-xs
                        text-zinc-500
                        mt-1
                      ">
                        {percent}% of {
                          data.type
                        }
                      </p>

                    </div>

                  </div>

                </div>

              );
            }
          )}

        </div>

      </div>

    </div>

  );
}