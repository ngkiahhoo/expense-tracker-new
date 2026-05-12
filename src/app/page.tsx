"use client";

import { useEffect, useState } from "react";

import PullToRefresh
from "react-simple-pull-to-refresh";

import {
  Wallet,
  TrendingDown,
  FolderTree,
  Receipt,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Plus,
} from "lucide-react";

import ExpenseCard from "../components/ExpenseCard";
import ExpensePanel from "../components/ExpensePanel";
import IncomePanel from "../components/IncomePanel";
import AnalyticsPanel from "../components/AnalyticsPanel";
import CategoryPanel from "../components/CategoryPanel";

import useExpenses from "../hooks/useExpenses";
import useIncome from "../hooks/useIncome";
import useCategories from "../hooks/useCategories";
import useAnalytics from "../hooks/useAnalytics";

export default function Home() {

  const currentMonth =
    `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`;

  const months =
    Array.from(
      { length: 12 },
      (_, i) => {

        const d = new Date();

        d.setMonth(
          d.getMonth() - i
        );

        return `${d.getFullYear()}-${String(
          d.getMonth() + 1
        ).padStart(2, "0")}`;
      }
    );

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth);

  const [showExpenseForm, setShowExpenseForm] =
    useState(false);

  const [showIncomeForm, setShowIncomeForm] =
    useState(false);

  const [showIncomeList, setShowIncomeList] =
    useState(false);

  const [showCategories, setShowCategories] =
    useState(false);

  const [showAnalytics, setShowAnalytics] =
    useState(false);

  /* EXPENSES */

  const {

    expenses,

    amount,
    setAmount,

    note,
    setNote,

    expenseDate,
    setExpenseDate,

    selectedCategory,
    setSelectedCategory,

    editingId,
    setEditingId,

    loading,

    error,

    fetchExpenses,

    saveExpense,

    deleteExpense,

    startEdit,

    resetExpenseForm,

  } = useExpenses(
    selectedMonth
  );

  /* INCOME */

  const {

    incomes,

    incomeAmount,
    setIncomeAmount,

    incomeNote,
    setIncomeNote,

    incomeEditingId,

    fetchIncome,

    addIncome,

    deleteIncome,

    startEditIncome,

  } = useIncome(
    selectedMonth
  );

  /* CATEGORY */

  const {

    categories,

    newCategory,
    setNewCategory,

    selectedType,
    setSelectedType,

    editingCategoryId,

    fetchCategories,

    addCategory,

    deleteCategory,

    editCategory,

  } = useCategories();

  /* ANALYTICS */

  const {

    analytics,

    totalSpending,

    totalIncome,

    spendingPercent,

  } = useAnalytics(
    expenses,
    incomes
  );

  /* FETCH */

  useEffect(() => {

    fetchExpenses();

    fetchIncome();

    fetchCategories();

  }, [selectedMonth]);

  return (

    <PullToRefresh

      onRefresh={async () => {

        await fetchExpenses();

        await fetchIncome();

        await fetchCategories();

      }}

    >

      <main
        className="
          min-h-screen
          bg-black
          text-white
          p-5
        "
      >

        <div
          className="
            max-w-md
            mx-auto
            space-y-6
          "
        >

          {/* HEADER */}

          <div
            className="
              flex
              items-start
              justify-between
            "
          >

            <div>

              <h1
                className="
                  text-6xl
                  font-black
                  tracking-tight
                "
              >
                Expense Tracker
              </h1>

              <p
                className="
                  text-zinc-500
                  mt-2
                "
              >
                Personal Finance Dashboard
              </p>

              <p
                className="
                  text-zinc-400
                  mt-4
                  text-lg
                "
              >
                {selectedMonth}
              </p>

            </div>

            <button

              onClick={() => {

                fetchExpenses();

                fetchIncome();

                fetchCategories();

              }}

              className="
                bg-zinc-900
                border
                border-zinc-800
                rounded-2xl
                p-4
              "
            >
              <RefreshCcw size={20}/>
            </button>

          </div>

          {/* MONTH */}

          <div
            className="
              bg-zinc-900/90
              border
              border-zinc-800
              rounded-3xl
              p-5
              shadow-xl
            "
          >

            <select

              value={selectedMonth}

              onChange={(e) =>
                setSelectedMonth(
                  e.target.value
                )
              }

              className="
                w-full
                bg-transparent
                outline-none
                text-lg
              "
            >

              {months.map((month) => (

                <option
                  key={month}
                  value={month}
                  className="
                    bg-black
                  "
                >
                  {month === currentMonth
                    ? "Current Month"
                    : month}
                </option>

              ))}

            </select>

          </div>

          {/* ERROR */}

          {error && (

            <div
              className="
                bg-red-500
                text-white
                p-4
                rounded-2xl
              "
            >
              {error}
            </div>

          )}

          {/* INCOME */}

          <div
            className="
              bg-zinc-900/90
              border
              border-emerald-500/30
              rounded-3xl
              p-5
              shadow-xl
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
                text-left
              "
            >

              <div
                className="
                  flex
                  justify-between
                  items-start
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
                    <span>
                      Monthly Income
                    </span>
                  </div>

                  <h1
                    className="
                      text-6xl
                      font-bold
                      mt-3
                      text-emerald-400
                    "
                  >
                    RM
                    {" "}
                    {totalIncome.toFixed(2)}
                  </h1>

                </div>

                <div
                  className="
                    text-zinc-400
                    mt-2
                  "
                >

                  {showIncomeList
                    ? <ChevronUp/>
                    : <ChevronDown/>}

                </div>

              </div>

            </button>

            {showIncomeList && (

              <div
                className="
                  mt-6
                  border-t
                  border-zinc-800
                  pt-6
                "
              >

                <IncomePanel
                showIncomeList={showIncomeList}
setShowIncomeList={setShowIncomeList}
                  totalIncome={totalIncome}
                  incomes={incomes}

                  showIncomeForm={showIncomeForm}

                  setShowIncomeForm={setShowIncomeForm}

                  incomeAmount={incomeAmount}

                  setIncomeAmount={setIncomeAmount}

                  incomeNote={incomeNote}

                  setIncomeNote={setIncomeNote}

                  incomeEditingId={incomeEditingId}

                  addIncome={addIncome}

                  startEditIncome={startEditIncome}

                  deleteIncome={deleteIncome}

                />

              </div>

            )}

          </div>

          {/* SPENDING */}

          <div
            className="
              bg-zinc-900/90
              border
              border-red-500/30
              rounded-3xl
              p-5
              shadow-xl
            "
          >

            <button

              onClick={() =>
                setShowAnalytics(
                  !showAnalytics
                )
              }

              className="
                w-full
                text-left
              "
            >

              <div
                className="
                  flex
                  justify-between
                  items-start
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
                    <TrendingDown size={18}/>
                    <span>
                      Total Spending
                    </span>
                  </div>

                  <h1
                    className="
                      text-6xl
                      font-bold
                      mt-3
                      text-red-400
                    "
                  >
                    RM
                    {" "}
                    {totalSpending.toFixed(2)}
                  </h1>

                  <p
                    className="
                      text-zinc-400
                      mt-3
                    "
                  >
                    {spendingPercent}
                    %
                    {" "}
                    of income
                  </p>

                </div>

                <div
                  className="
                    text-zinc-400
                    mt-2
                  "
                >

                  {showAnalytics
                    ? <ChevronUp/>
                    : <ChevronDown/>}

                </div>

              </div>

            </button>

            {showAnalytics && (

              <div
                className="
                  mt-6
                  border-t
                  border-zinc-800
                  pt-6
                "
              >

                <AnalyticsPanel

                  analytics={analytics}

                  totalSpending={totalSpending}

                />

              </div>

            )}

          </div>

          {/* EXPENSE FORM */}

          <div
            className="
              bg-zinc-900/90
              border
              border-zinc-800
              rounded-3xl
              p-5
              shadow-xl
            "
          >

            <button

              onClick={() =>
                setShowExpenseForm(
                  !showExpenseForm
                )
              }

              className="
                w-full
                flex
                items-center
                justify-center
                gap-3
                text-xl
                font-bold
              "
            >

              <Plus size={22}/>

              {showExpenseForm
                ? "Close Expense Form"
                : "Add Expense"}

            </button>

            {showExpenseForm && (

              <div
                className="
                  mt-6
                  border-t
                  border-zinc-800
                  pt-6
                "
              >

                <ExpensePanel
                showExpenseForm={showExpenseForm}
setShowExpenseForm={setShowExpenseForm}
                  amount={amount}

                  setAmount={setAmount}

                  note={note}

                  setNote={setNote}

                  expenseDate={expenseDate}

                  setExpenseDate={setExpenseDate}

                  selectedCategory={selectedCategory}

                  setSelectedCategory={setSelectedCategory}

                  categories={categories}

                  editingId={editingId}

                  loading={loading}

                  saveExpense={saveExpense}

                  resetExpenseForm={resetExpenseForm}

                  setEditingId={setEditingId}

                />

              </div>

            )}

          </div>

          {/* CATEGORIES */}

          <div
            className="
              bg-zinc-900/90
              border
              border-purple-500/30
              rounded-3xl
              p-5
              shadow-xl
            "
          >

            <button

              onClick={() =>
                setShowCategories(
                  !showCategories
                )
              }

              className="
                w-full
                flex
                items-center
                justify-between
                text-xl
                font-bold
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >
                <FolderTree size={22}/>
                Categories
              </div>

              {showCategories
                ? <ChevronUp/>
                : <ChevronDown/>}

            </button>

            {showCategories && (

              <div
                className="
                  mt-6
                  border-t
                  border-zinc-800
                  pt-6
                "
              >

                <CategoryPanel

  showCategories={showCategories}
  setShowCategories={setShowCategories}

  newCategory={newCategory}
  setNewCategory={setNewCategory}

  selectedType={selectedType}
  setSelectedType={setSelectedType}

  editingCategoryId={editingCategoryId}

  addCategory={addCategory}
  editCategory={editCategory}
  deleteCategory={deleteCategory}

  categories={categories}

/>

              </div>

            )}

          </div>

          {/* EXPENSE LIST */}

          <div
            className="
              space-y-4
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
                px-2
              "
            >

              <Receipt size={22}/>

              <h2
                className="
                  text-2xl
                  font-bold
                "
              >
                Expense Records
              </h2>

            </div>

            {loading && (

              <div
                className="
                  bg-zinc-900
                  rounded-3xl
                  p-10
                  text-center
                  text-zinc-400
                "
              >
                Loading...
              </div>

            )}

            {!loading &&
              expenses.length === 0 && (

              <div
                className="
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-3xl
                  p-10
                  text-center
                "
              >

                <h2
                  className="
                    text-2xl
                    font-bold
                    mb-2
                  "
                >
                  No expenses yet
                </h2>

                <p
                  className="
                    text-zinc-400
                  "
                >
                  Tap Add Expense to start
                </p>

              </div>

            )}

            {!loading &&
              expenses.map((expense) => (

              <ExpenseCard
  key={expense.id}

  expense={expense}

  startEdit={startEdit}

  deleteExpense={deleteExpense}
/>

            ))}

          </div>

        </div>

      </main>

    </PullToRefresh>
  );
}