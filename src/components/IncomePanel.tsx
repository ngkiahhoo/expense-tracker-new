"use client";

import {
  Wallet,
} from "lucide-react";

import IncomeCard
from "./IncomeCard";

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

}: any) {

  return (

    <>

      {/* INCOME CARD */}

      <div
        className="
          bg-zinc-900
          rounded-3xl
          p-5
          mb-5
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
              mt-5
              space-y-3
            "
          >

            {incomes.map(
              (income:any) => (

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
              bg-black
              rounded-2xl
              p-4
            "
          />

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