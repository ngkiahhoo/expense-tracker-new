"use client";

import {
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";

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

        <Button
          onClick={refreshAll}
          variant="ghost"
          size="iconLg"
          title="Refresh"
          aria-label="Refresh"
        >

          <RotateCcw size={20}/>

        </Button>

      </div>

      {/* MONTH SELECT */}

      <Select
        value={selectedMonth}
        onChange={(e) =>
          setSelectedMonth(
            e.target.value
          )
        }
        className="mb-5"
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

      </Select>

    </>

  );
}
