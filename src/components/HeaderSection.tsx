"use client";

import {
  RotateCcw,
} from "lucide-react";

export default function HeaderSection({

  selectedMonth,

  currentMonth,

  months,

  setSelectedMonth,

  refreshAll,

}: any) {

  return (

    <>

      {/* HEADER */}

      <div
        className="
          flex
          justify-between
          items-start
          mb-6
        "
      >

        <div>

          <h1
            className="
              text-5xl
              font-bold
            "
          >
            Expense Tracker
          </h1>

          <p
            className="
              text-zinc-400
              mt-2
            "
          >
            {selectedMonth}
          </p>

        </div>

        <button
          onClick={refreshAll}
          className="
            bg-zinc-900
            p-4
            rounded-2xl
          "
        >

          <RotateCcw size={20}/>

        </button>

      </div>

      {/* MONTH SELECT */}

      <select
        value={selectedMonth}
        onChange={(e) =>
          setSelectedMonth(
            e.target.value
          )
        }
        className="
          w-full
          bg-zinc-900
          rounded-2xl
          p-4
          mb-5
          outline-none
        "
      >

        {months.map(
          (month:string) => (

            <option
              key={month}
              value={month}
            >

              {month === currentMonth
                ? "Current Month"
                : month}

            </option>

          )
        )}

      </select>

    </>

  );
}