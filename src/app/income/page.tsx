"use client";

import { useEffect, useMemo, useState } from "react";

import { supabase } from "../../lib/supabase";

import {
  Pencil,
  Trash2,
  X,
  Wallet,
} from "lucide-react";

export default function IncomePage() {

  const currentMonth =
    `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`;

  const [incomes, setIncomes] =
    useState<any[]>([]);

  const [amount, setAmount] =
    useState("");

  const [note, setNote] =
    useState("");

  const [incomeDate, setIncomeDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth);

  useEffect(() => {
    fetchIncome();
  }, [selectedMonth]);

  async function fetchIncome() {

    const start =
      `${selectedMonth}-01`;

    const end =
      `${selectedMonth}-31`;

    const { data } = await supabase
      .from("incomes")
      .select("*")
      .gte("income_date", start)
      .lte("income_date", end)
      .order("income_date", {
        ascending: false,
      });

    if (data) {
      setIncomes(data);
    }
  }

  async function saveIncome() {

    if (!amount) return;

    if (editingId) {

      await supabase
        .from("incomes")
        .update({
          amount:
            Number(amount),

          note,

          income_date:
            incomeDate,
        })
        .eq("id", editingId);

    } else {

      await supabase
        .from("incomes")
        .insert([
          {
            amount:
              Number(amount),

            note,

            income_date:
              incomeDate,
          },
        ]);
    }

    resetForm();

    fetchIncome();
  }

  async function deleteIncome(
    id:number
  ) {

    await supabase
      .from("incomes")
      .delete()
      .eq("id", id);

    fetchIncome();
  }

  function startEdit(
    income:any
  ) {

    setEditingId(income.id);

    setAmount(
      income.amount.toString()
    );

    setNote(income.note || "");

    setIncomeDate(
      income.income_date
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {

    setEditingId(null);

    setAmount("");

    setNote("");

    setIncomeDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );
  }

  const totalIncome =
    useMemo(() => {

      return incomes.reduce(
        (sum, item) =>
          sum + Number(item.amount),
        0
      );

    }, [incomes]);

  return (

    <main className="
      min-h-screen
      bg-black
      text-white
      p-4
    ">

      <div className="
        max-w-md
        mx-auto
      ">

        <h1 className="
          text-5xl
          font-bold
          mb-2
        ">
          Income
        </h1>

        <p className="
          text-zinc-400
          mb-6
        ">
          Monthly income tracking
        </p>

        <select
          value={selectedMonth}
          onChange={(e)=>
            setSelectedMonth(
              e.target.value
            )
          }
          className="
            w-full
            bg-zinc-900
            border
            border-zinc-800
            rounded-2xl
            p-4
            mb-5
          "
        >

          <option value={currentMonth}>
            Current Month
          </option>

          <option value="2026-04">
            2026-04
          </option>

          <option value="2026-03">
            2026-03
          </option>

        </select>

        <div className="
          bg-zinc-900
          rounded-3xl
          p-6
          mb-5
        ">

          <div className="
            flex
            items-center
            gap-2
            mb-2
          ">

            <Wallet size={18}/>

            <p className="
              text-zinc-400
            ">
              Total Income
            </p>

          </div>

          <h2 className="
            text-5xl
            font-bold
          ">
            RM {totalIncome.toFixed(2)}
          </h2>

        </div>

        <div className="
          bg-zinc-900
          rounded-3xl
          p-5
          mb-5
          space-y-3
        ">

          <input
            type="number"
            placeholder="Income Amount"
            value={amount}
            onChange={(e)=>
              setAmount(
                e.target.value
              )
            }
            className="
              w-full
              bg-black
              rounded-2xl
              p-4
            "
          />

          <input
            type="text"
            placeholder="Income Note"
            value={note}
            onChange={(e)=>
              setNote(
                e.target.value
              )
            }
            className="
              w-full
              bg-black
              rounded-2xl
              p-4
            "
          />

          <input
            type="date"
            value={incomeDate}
            onChange={(e)=>
              setIncomeDate(
                e.target.value
              )
            }
            className="
              w-full
              bg-black
              rounded-2xl
              p-4
            "
          />

          <div className="
            flex
            gap-3
          ">

            <button
              onClick={saveIncome}
              className="
                flex-1
                bg-white
                text-black
                rounded-2xl
                py-4
                font-bold
              "
            >

              {editingId
                ? "Update Income"
                : "Add Income"}

            </button>

            {editingId && (

              <button
                onClick={resetForm}
                className="
                  bg-zinc-700
                  px-5
                  rounded-2xl
                "
              >
                <X size={18}/>
              </button>

            )}

          </div>

        </div>

        <div className="
          space-y-3
        ">

          {incomes.map((income) => (

            <div
              key={income.id}
              className="
                bg-zinc-900
                rounded-3xl
                p-5
                flex
                justify-between
              "
            >

              <div>

                <p className="
                  font-bold
                  text-lg
                ">
                  {income.note ||
                    "Income"}
                </p>

                <p className="
                  text-zinc-400
                  text-sm
                  mt-1
                ">
                  {income.income_date}
                </p>

              </div>

              <div className="
                text-right
              ">

                <p className="
                  text-3xl
                  font-bold
                  mb-3
                ">
                  RM {income.amount}
                </p>

                <div className="
                  flex
                  gap-2
                  justify-end
                ">

                  <button
                    onClick={() =>
                      startEdit(income)
                    }
                    className="
                      bg-zinc-800
                      p-3
                      rounded-2xl
                    "
                  >
                    <Pencil size={16}/>
                  </button>

                  <button
                    onClick={() =>
                      deleteIncome(
                        income.id
                      )
                    }
                    className="
                      bg-red-500
                      p-3
                      rounded-2xl
                    "
                  >
                    <Trash2 size={16}/>
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      </div>

    </main>
  );
}