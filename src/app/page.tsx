"use client";

import {
  useEffect,
  useState,
} from "react";

import PullToRefresh
from "react-simple-pull-to-refresh";

import {
  CalendarDays,
  ChartPie,
  ClipboardList,
  Pencil,
  FolderTree,
  Plus,
  TrendingDown,
  type LucideIcon,
  Wallet,
  X,
} from "lucide-react";

import ExpensePanel
from "../components/ExpensePanel";
import IncomePanel
from "../components/IncomePanel";
import CategoryPanel
from "../components/CategoryPanel";
import AnalyticsPanel
from "../components/AnalyticsPanel";
import ExpenseRecordsPanel
from "../components/ExpenseRecordsPanel";

import useExpenses
from "../hooks/useExpenses";
import useIncome
from "../hooks/useIncome";
import useCategories
from "../hooks/useCategories";
import useAnalytics
from "../hooks/useAnalytics";
import useSavedNotes
from "../hooks/useSavedNotes";
import type {
  Expense,
} from "../types/expense";
import type {
  Income,
} from "../types/income";

type BottomTool =
  | "expense"
  | "categories"
  | "records"
  | "income";

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

  const [activeTool, setActiveTool] =
    useState<BottomTool | null>(null);

  const [showExpenseForm, setShowExpenseForm] =
    useState(true);

  const [showIncomeForm, setShowIncomeForm] =
    useState(true);

  const [showIncomeList, setShowIncomeList] =
    useState(true);

  const [showCategories, setShowCategories] =
    useState(true);

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

  const {
    savedNotes,
    addSavedNote,
    updateSavedNote,
    deleteSavedNote,
  } = useSavedNotes();

  const {
    analytics,
    totalSpending,
    totalIncome,
    spendingPercent,
  } = useAnalytics(
    expenses,
    incomes
  );

  useEffect(() => {
    fetchExpenses();
    fetchIncome();
    fetchCategories();
    // Fetch callbacks come from local hooks and intentionally refresh when the month changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  async function refreshAll() {
    await Promise.all([
      fetchExpenses(),
      fetchIncome(),
      fetchCategories(),
    ]);
  }

  async function handleSaveExpense() {
    const noteToSave = note;

    const didSave =
      await saveExpense();

    if (didSave) {
      addSavedNote(
        noteToSave
      );
    }
  }

  function toggleTool(
    tool: Exclude<BottomTool, "income">
  ) {
    setActiveTool((current) =>
      current === tool
        ? null
        : tool
    );

    if (tool === "expense") {
      setShowExpenseForm(true);
    }

    if (tool === "categories") {
      setShowCategories(true);
    }
  }

  function openIncomeCrud() {
    setShowIncomeList(true);
    setShowIncomeForm(true);
    setActiveTool("income");
  }

  function handleStartEdit(
    expense: Expense
  ) {
    startEdit(expense);
    setShowExpenseForm(true);
    setActiveTool("expense");
  }

  function handleStartEditIncome(
    income: Income
  ) {
    startEditIncome(income);
    setShowIncomeForm(true);
  }

  const sheetTitle =
    activeTool === "expense"
      ? editingId
        ? "Edit Expense"
        : "Add Expense"
      : activeTool === "income"
      ? incomeEditingId
        ? "Edit Income"
        : "Income CRUD"
      : activeTool === "categories"
      ? "Category CRUD"
      : "Expense Records";

  const sheetWidthClass =
    activeTool === "records"
      ? "lg:w-[720px]"
      : "lg:w-[430px]";

  return (

    <PullToRefresh
      onRefresh={refreshAll}
    >

      <div
        className="
          min-h-screen
          bg-black
          text-white
        "
      >

        <main
          className="
            min-h-screen
            px-4
            pt-4
            pb-40
            sm:px-6
            sm:pt-6
            md:px-8
            lg:pb-28
          "
        >

          <div
            className="
              w-full
              max-w-md
              mx-auto
              grid
              gap-5
              md:max-w-5xl
              md:grid-cols-2
              lg:max-w-6xl
              lg:grid-cols-3
            "
          >

            <section
              className="
                bg-zinc-900/90
                border
                border-zinc-800
                rounded-3xl
                p-5
                sm:p-6
                md:col-span-2
                lg:col-span-1
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-zinc-400
                  mb-3
                "
              >
                <CalendarDays size={18}/>
                <span>
                  View Month
                </span>
              </div>

              <select
                value={selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value
                  )
                }
                className="
                  w-full
                  bg-black
                  border
                  border-zinc-800
                  rounded-2xl
                  p-4
                  outline-none
                  text-base
                  sm:text-lg
                "
              >

                {months.map((month) => (

                  <option
                    key={month}
                    value={month}
                    className="bg-black"
                  >
                    {month === currentMonth
                      ? "Current Month"
                      : month}
                  </option>

                ))}

              </select>

            </section>

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

            <section
              className="
                bg-zinc-900/90
                border
                border-emerald-500/30
                rounded-3xl
                p-5
                sm:p-6
              "
            >

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

              <h2
                className="
                  text-5xl
                  font-bold
                  mt-3
                  text-emerald-400
                  break-words
                  lg:text-4xl
                  xl:text-5xl
                "
              >
                RM {totalIncome.toFixed(2)}
              </h2>

              <button
                onClick={openIncomeCrud}
                className="
                  mt-5
                  inline-flex
                  items-center
                  gap-2
                  bg-white
                  text-black
                  rounded-2xl
                  px-4
                  py-3
                  text-sm
                  font-bold
                "
              >
                <Pencil size={16}/>
                Manage Income
              </button>

            </section>

            <section
              className="
                bg-zinc-900/90
                border
                border-red-500/30
                rounded-3xl
                p-5
                sm:p-6
              "
            >

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

              <h2
                className="
                  text-5xl
                  font-bold
                  mt-3
                  text-red-400
                  break-words
                  lg:text-4xl
                  xl:text-5xl
                "
              >
                RM {totalSpending.toFixed(2)}
              </h2>

              <p
                className="
                  text-zinc-400
                  mt-3
                "
              >
                {spendingPercent}% of income
              </p>

            </section>

            <section
              className="
                md:col-span-2
                lg:col-span-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-zinc-400
                  mb-3
                  px-1
                "
              >
                <ChartPie size={18}/>
                <span>
                  Spending Analytics
                </span>
              </div>

              <AnalyticsPanel
                analytics={analytics}
                totalSpending={totalSpending}
              />
            </section>

          </div>

        </main>

        {activeTool && (

          <div
            className={`
              fixed
              inset-x-0
              bottom-24
              z-40
              px-4
              md:bottom-28
              md:px-6
              lg:inset-x-auto
              lg:top-8
              lg:right-8
              lg:bottom-28
              lg:px-0
              lg:max-w-[calc(100vw-2rem)]
              ${sheetWidthClass}
            `}
          >
            <div
              className="
                w-full
                max-w-md
                mx-auto
                max-h-[68vh]
                overflow-y-auto
                bg-zinc-950
                border
                border-zinc-800
                rounded-3xl
                shadow-2xl
                md:max-w-2xl
                md:max-h-[72vh]
                lg:max-w-none
                lg:max-h-full
              "
            >

              <div
                className="
                  sticky
                  top-0
                  z-10
                  flex
                  items-center
                  justify-between
                  gap-3
                  bg-zinc-950
                  border-b
                  border-zinc-800
                  p-4
                "
              >
                <div>
                  <p
                    className="
                      text-xs
                      uppercase
                      tracking-wide
                      text-zinc-500
                    "
                  >
                    Quick Action
                  </p>

                  <h2
                    className="
                      text-xl
                      font-bold
                    "
                  >
                    {sheetTitle}
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setActiveTool(null)
                  }
                  title="Close panel"
                  aria-label="Close panel"
                  className="
                    bg-zinc-900
                    rounded-2xl
                    p-3
                    shrink-0
                  "
                >
                  <X size={18}/>
                </button>
              </div>

              <div className="p-4">
                {activeTool === "expense" && (
                  <ExpensePanel
                    showExpenseForm={showExpenseForm}
                    setShowExpenseForm={setShowExpenseForm}
                    showToggle={false}
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
                    saveExpense={handleSaveExpense}
                    resetExpenseForm={resetExpenseForm}
                    setEditingId={setEditingId}
                    savedNotes={savedNotes}
                    addSavedNote={addSavedNote}
                    updateSavedNote={updateSavedNote}
                    deleteSavedNote={deleteSavedNote}
                  />
                )}

                {activeTool === "income" && (
                  <IncomePanel
                    totalIncome={totalIncome}
                    incomes={incomes}
                    showIncomeList={showIncomeList}
                    setShowIncomeList={setShowIncomeList}
                    showIncomeForm={showIncomeForm}
                    setShowIncomeForm={setShowIncomeForm}
                    incomeAmount={incomeAmount}
                    setIncomeAmount={setIncomeAmount}
                    incomeNote={incomeNote}
                    setIncomeNote={setIncomeNote}
                    incomeEditingId={incomeEditingId}
                    addIncome={addIncome}
                    startEditIncome={handleStartEditIncome}
                    deleteIncome={deleteIncome}
                  />
                )}

                {activeTool === "categories" && (
                  <CategoryPanel
                    showCategories={showCategories}
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
                )}

                {activeTool === "records" && (
                  <ExpenseRecordsPanel
                    expenses={expenses}
                    loading={loading}
                    startEdit={handleStartEdit}
                    deleteExpense={deleteExpense}
                  />
                )}
              </div>

            </div>
          </div>

        )}

        <nav
          className="
            fixed
            inset-x-0
            bottom-0
            z-50
            border-t
            border-zinc-800
            bg-black/95
            backdrop-blur
            px-3
            pb-[env(safe-area-inset-bottom)]
            lg:px-6
          "
        >
          <div
            className="
              max-w-md
              mx-auto
              grid
              grid-cols-3
              gap-2
              py-3
              md:max-w-xl
              lg:max-w-2xl
            "
          >
            <BottomBarButton
              active={activeTool === "expense"}
              onClick={() =>
                toggleTool("expense")
              }
              icon={Plus}
              label="Add"
              description="Expense"
            />

            <BottomBarButton
              active={activeTool === "categories"}
              onClick={() =>
                toggleTool("categories")
              }
              icon={FolderTree}
              label="Category"
              description="CRUD"
            />

            <BottomBarButton
              active={activeTool === "records"}
              onClick={() =>
                toggleTool("records")
              }
              icon={ClipboardList}
              label="Records"
              description="History"
            />
          </div>
        </nav>

      </div>

    </PullToRefresh>
  );
}

function BottomBarButton({
  active,
  onClick,
  icon: Icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        min-h-16
        rounded-2xl
        border
        p-3
        text-left
        transition
        sm:p-4
        md:text-center
        ${
          active
            ? "border-white bg-white text-black"
            : "border-zinc-800 bg-zinc-900 text-white"
        }
      `}
    >
      <div
        className="
          flex
          items-center
          gap-2
          md:justify-center
        "
      >
        <Icon size={19}/>
        <span
          className="
            text-sm
            font-bold
            leading-none
          "
        >
          {label}
        </span>
      </div>

      <p
        className={`
          mt-2
          text-[11px]
          leading-none
          ${
            active
              ? "text-zinc-700"
              : "text-zinc-500"
          }
        `}
      >
        {description}
      </p>
    </button>
  );
}
