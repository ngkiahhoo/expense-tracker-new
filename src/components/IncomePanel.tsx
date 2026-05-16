"use client";

import {
  Wallet,
} from "lucide-react";

import IncomeCard
from "./IncomeCard";

import type {
  Income,
} from "../types/income";

interface IncomePanelProps {
  totalIncome: number;
  incomes: Income[];
  showIncomeList: boolean;
  setShowIncomeList: (value: boolean) => void;
  showIncomeForm: boolean;
  setShowIncomeForm: (value: boolean) => void;
  incomeAmount: string;
  setIncomeAmount: (value: string) => void;
  incomeNote: string;
  setIncomeNote: (value: string) => void;
  incomeEditingId: number | null;
  addIncome: () => void | Promise<void>;
  startEditIncome: (income: Income) => void;
  deleteIncome: (id: number) => void | Promise<void>;
}

export default function IncomePanel({

  
  totalIncome,

  incomes,

  showIncomeList,
  setShowIncomeList,

  showIncomeForm,
  setShowIncomeForm,

  incomeAmount,
  setIncomeAmount,

  incomeNote,
  setIncomeNote,

  incomeEditingId,

  addIncome,

  startEditIncome,

  deleteIncome,

}: IncomePanelProps) {

  return (

    <>

      {/* INCOME CARD */}

      <div
        className="
          bg-zinc-900
          rounded-3xl
          p-5
          mb-5
          sm:p-6
        "
      >

        <button
          onClick={() =>
            setShowIncomeList(
              !showIncomeList
            )
          }
          className="
            w-full
            flex
            justify-between
            items-center
          "
        >

          <div>

            <div
              className="
                flex
                items-center
                gap-2
                text-zinc-400
              "
            >

              <Wallet size={18}/>

              Monthly Income

            </div>

            <h2
              className="
                text-5xl
                font-bold
                mt-2
                break-words
              "
            >
              RM
              {" "}
              {totalIncome.toFixed(2)}
            </h2>

          </div>

        </button>

        {/* INCOME LIST */}

        {showIncomeList && (

          <div
            className="
              grid
              gap-3
              mt-5
              md:grid-cols-2
            "
          >

            {incomes.map(
              (income) => (

                <IncomeCard

  key={income.id}

  income={income}

  startEditIncome={startEditIncome}

  deleteIncome={deleteIncome}

/>

              )
            )}

          </div>

        )}

      </div>

      {/* TOGGLE BUTTON */}

      <button
        onClick={() =>
          setShowIncomeForm(
            !showIncomeForm
          )
        }
        className="
          w-full
          bg-zinc-900
          rounded-2xl
          p-4
          mb-5
          font-bold
        "
      >

        + Add Income

      </button>

      {/* FORM */}

      {showIncomeForm && (

        <div
          className="
            bg-zinc-900
            rounded-3xl
            p-5
            mb-5
            space-y-3
            sm:p-6
          "
        >

          <div
            className="
              grid
              gap-3
              md:grid-cols-2
            "
          >

            <input
              type="number"
              placeholder="Income Amount"
              value={incomeAmount}
              onChange={(e) =>
                setIncomeAmount(
                  e.target.value
                )
              }
              className="
                w-full
                min-w-0
                bg-black
                rounded-2xl
                p-4
              "
            />

            <input
              type="text"
              placeholder="Income Note"
              value={incomeNote}
              onChange={(e) =>
                setIncomeNote(
                  e.target.value
                )
              }
              className="
                w-full
                min-w-0
                bg-black
                rounded-2xl
                p-4
              "
            />

          </div>

          <button
            onClick={addIncome}
            className="
              w-full
              bg-white
              text-black
              rounded-2xl
              p-4
              font-bold
            "
          >

            {incomeEditingId
              ? "Update Income"
              : "Add Income"}

          </button>

        </div>

      )}

    </>

  );
}
