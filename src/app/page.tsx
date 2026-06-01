"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react";

import PullToRefresh
from "react-simple-pull-to-refresh";

import {
  CalendarDays,
  CalendarSync,
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

import { useToast } from "@/contexts/ToastContext";

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
import RecurringExpensePanel
from "../components/RecurringExpensePanel";
import ExpenseCategoryBreakdown
from "../components/features/analytics/ExpenseCategoryBreakdown";
import CategoryExpenseSheet
from "../components/features/analytics/CategoryExpenseSheet";

import useExpenses
from "../hooks/useExpenses";
import useIncome
from "../hooks/useIncome";
import useCategories
from "../hooks/useCategories";
import useCategoryBreakdown
from "../hooks/useCategoryBreakdown";
import useAnalytics
from "../hooks/useAnalytics";
import useSavedNotes
from "../hooks/useSavedNotes";
import useRecurringExpenses
from "../hooks/useRecurringExpenses";
import useAIExport
from "../hooks/useAIExport";
import type {
  Expense,
} from "../types/expense";
import type {
  Income,
} from "../types/income";
import type {
  CategoryBreakdownItem,
} from "../types/analytics";

type BottomTool =
  | "expense"
  | "recurring"
  | "categories"
  | "records"
  | "income";

const fullAIExportOptions = {
  includeExpenses:true,
  includeMonthlySummary:true,
  includeCategories:true,
  includeAIPrompt:true,
};

export default function Home() {

  const toast = useToast();

  const today =
    new Date();

  const currentMonth =
    `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

  const months =
    Array.from(
      { length: 12 },
      (_, i) => {
        const d =
          new Date(
            today.getFullYear(),
            today.getMonth() - i,
            1
          );

        const year =
          d.getFullYear();

        const month =
          String(
            d.getMonth() + 1
          ).padStart(2, "0");

        return `${year}-${month}`;
      }
    );

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth);

  const [activeTool, setActiveTool] =
    useState<BottomTool | null>(null);

  function handlePopupFocus(
    event: FocusEvent<HTMLDivElement>
  ) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    const target = event.target;

    const tagName = target.tagName;
    if (
      tagName === "INPUT" ||
      tagName === "TEXTAREA" ||
      tagName === "SELECT"
    ) {
      setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 150);
    }
  }

  // sheet panel state for activeTool panels

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
    recurringExpenses,

    recurringName,
    setRecurringName,

    recurringAmount,
    setRecurringAmount,

    recurringDescription,
    setRecurringDescription,

    recurringCategory,
    setRecurringCategory,

    recurringRepeatDay,
    setRecurringRepeatDay,

    recurringIsActive,
    setRecurringIsActive,

    recurringEditingId,
    setRecurringEditingId,

    recurringLoading,
    recurringError,
    generatedRecurringCount,

    fetchRecurringExpenses,
    saveRecurringExpense,
    deleteRecurringExpense,
    startEditRecurringExpense,
    resetRecurringExpenseForm,
    generateDueRecurringExpenses,
  } = useRecurringExpenses(
    selectedMonth
  );

  const {
    loading:exportLoading,
    copied:exportCopied,
    error:exportError,
    generateExport,
    copyToClipboard,
    payload:exportPayload,
    showModal:showExportModalFromHook,
    setShowModal:setShowExportModalFromHook,
  } = useAIExport();

  const {
    analytics,
    totalSpending,
    totalIncome,
    spendingPercent,
  } = useAnalytics(
    expenses,
    incomes
  );

  const balance =
    totalIncome - totalSpending;

  const balancePercent = totalIncome > 0
    ? ((balance / totalIncome) * 100).toFixed(1)
    : "0.0";

  const categoryBreakdown = useCategoryBreakdown(
    expenses,
    categories
  );

  const [activeCategory, setActiveCategory] =
    useState<CategoryBreakdownItem | null>(null);
  const [exportModalCopied, setExportModalCopied] = useState(false);

  // Use the modal state from the hook
  const showExportModal = showExportModalFromHook;
  const setShowExportModal = setShowExportModalFromHook;

  useEffect(() => {
    async function loadMonthData() {
      await generateDueRecurringExpenses();

      await Promise.all([
        fetchExpenses(),
        fetchIncome(),
        fetchCategories(),
        fetchRecurringExpenses(),
      ]);
    }

    loadMonthData();
    // Fetch callbacks come from local hooks and intentionally refresh when the month changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  // Auto-generate recurring expenses every hour
  useEffect(() => {
    // Check immediately on mount
    generateDueRecurringExpenses();

    // Then check every hour
    const interval = setInterval(
      async () => {
        const createdCount = await generateDueRecurringExpenses();
        if (createdCount > 0) {
          await fetchExpenses();
        }
      },
      60 * 60 * 1000 // 1 hour in milliseconds
    );

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshAll() {
    await generateDueRecurringExpenses();

    await Promise.all([
      fetchExpenses(),
      fetchIncome(),
      fetchCategories(),
      fetchRecurringExpenses(),
    ]);
  }

  async function handleSaveExpense() {
    const noteToSave = note;

    const result =
      await saveExpense();

    if (result.success) {
      addSavedNote(
        noteToSave
      );
      toast.showToast(result.message || "Expense saved successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to save expense", "error");
    }

    return result.success;
  }

  async function handleSaveRecurringExpense() {
    const result =
      await saveRecurringExpense();

    if (result.success) {
      await generateDueRecurringExpenses();
      await fetchExpenses();
      toast.showToast(result.message || "Recurring expense saved successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to save recurring expense", "error");
    }

    return result.success;
  }

  async function handleDeleteRecurringExpense(id: number) {
    const result = await deleteRecurringExpense(id);
    if (result.success) {
      toast.showToast(result.message || "Recurring expense deleted successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to delete recurring expense", "error");
    }
    return result.success;
  }

  async function handleDeleteExpense(id: number) {
    const result = await deleteExpense(id);
    if (result.success) {
      toast.showToast(result.message || "Expense deleted successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to delete expense", "error");
    }
    return result.success;
  }

  async function handleDeleteIncome(id: number) {
    const result = await deleteIncome(id);
    if (result.success) {
      toast.showToast(result.message || "Income deleted successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to delete income", "error");
    }
  }

  async function handleAddIncome() {
    const result = await addIncome();
    if (result.success) {
      toast.showToast(result.message || "Income added successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to add income", "error");
    }
    return result.success;
  }

  async function handleAddCategory() {
    const result = await addCategory();
    if (result.success) {
      toast.showToast(result.message || "Category added successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to add category", "error");
    }
    return result.success;
  }

  async function handleDeleteCategory(id: number) {
    const result = await deleteCategory(id);
    if (result.success) {
      toast.showToast(result.message || "Category deleted successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to delete category", "error");
    }
  }

  async function handleCopyAIExport() {
    const exportPayload =
      await generateExport(
        "all",
        fullAIExportOptions
      );

    if (!exportPayload) {
      toast.showToast("AI export failed. Check your connection and try again.", "error");
      return false;
    }

    const copied = await copyToClipboard(
      exportPayload
    );

    if (copied) {
      toast.showToast("Export text copied to clipboard.", "success");
    } else {
      toast.showToast("Copy failed. Use the modal to copy manually.", "warning");
    }
    return copied;
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

    if (tool === "recurring") {
      void fetchRecurringExpenses();
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
      : activeTool === "recurring"
      ? recurringEditingId
        ? "Edit Recurring"
        : "Recurring Expenses"
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
              max-w-5xl
              mx-auto
              grid
              gap-4
            "
          >

            <section
              className="
                bg-zinc-900/90
                border
                border-zinc-800
                rounded-3xl
                p-4
                sm:p-5
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
                p-3
                sm:p-4
                min-h-[104px]
                flex
                flex-col
                justify-between
              "
            >

              <div className="flex items-start justify-between gap-4">
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

                  <h2
                    className="
                      text-3xl
                      font-bold
                      mt-2
                      text-emerald-400
                      leading-tight
                    "
                  >
                    <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
                      <span className="text-base text-zinc-400">RM</span>
                      <span>{totalIncome.toFixed(2)}</span>
                    </span>
                  </h2>
                </div>

                <button
                  onClick={openIncomeCrud}
                  className="
                    inline-flex
                    items-center
                    gap-2
                    bg-white
                    text-black
                    rounded-2xl
                    px-3
                    py-2
                    text-sm
                    font-bold
                    shrink-0
                  "
                >
                  <Pencil size={16}/>
                  Manage Income
                </button>
              </div>

            </section>

            <section
              className="
                bg-zinc-900/90
                border
                border-red-500/30
                rounded-3xl
                p-3
                sm:p-4
                min-h-[104px]
                flex
                flex-col
                justify-between
              "
            >

              <div
                className="
                  text-zinc-400
                  mb-2
                "
              >
                Total Spending
              </div>

              <h2
                className="
                  text-3xl
                  font-bold
                  text-red-400
                  leading-tight
                "
              >
                <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
                  <span className="text-base text-zinc-400">RM</span>
                  <span>{totalSpending.toFixed(2)}</span>
                </span>
              </h2>

              <p
                className="
                  text-sm
                  text-zinc-400
                  mt-1
                "
              >
                {spendingPercent}% of income
              </p>

            </section>

            <section
              className="
                bg-zinc-900/90
                border
                border-blue-500/30
                rounded-3xl
                p-3
                sm:p-4
                min-h-[104px]
                flex
                flex-col
                justify-between
              "
            >

              <div
                className="
                  text-zinc-400
                  mb-2
                "
              >
                Balance
              </div>

              <h2
                className="
                  text-3xl
                  font-bold
                  text-sky-400
                  leading-tight
                "
              >
                <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
                  <span className="text-base text-zinc-400">RM</span>
                  <span>{balance.toFixed(2)}</span>
                </span>
              </h2>

              <p
                className="
                  text-sm
                  text-zinc-400
                  mt-1
                "
              >
                {balancePercent}% of income
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

                <div
                  className="
                    ml-auto
                    flex
                    items-center
                    gap-2
                  "
                >
                  {exportError && (
                    <span
                      className="
                        hidden
                        max-w-[220px]
                        truncate
                        text-xs
                        text-red-400
                        sm:inline
                      "
                    >
                      {exportError}
                    </span>
                  )}

                  <button
                    onClick={handleCopyAIExport}
                    disabled={exportLoading}
                    className={`
                      rounded-2xl
                      px-3
                      py-2
                      text-sm
                      font-bold
                      transition
                      disabled:opacity-60
                      ${
                        exportCopied
                          ? "bg-emerald-500 text-black"
                          : "bg-white text-black"
                      }
                    `}
                  >
                    {exportLoading
                      ? "Copying..."
                      : exportCopied
                      ? "Copied!"
                      : "Export for AI"}
                  </button>
                </div>
              </div>

              <AnalyticsPanel
                analytics={analytics}
                totalSpending={totalSpending}
                totalIncome={totalIncome}
              />
            </section>

            <section
              className="
                md:col-span-2
                lg:col-span-3
              "
            >
              <ExpenseCategoryBreakdown
                breakdown={categoryBreakdown}
                loading={loading}
                onSelectCategory={setActiveCategory}
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
            onFocusCapture={handlePopupFocus}
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
                    bg-white
                    text-black
                    rounded-2xl
                    p-3
                    shrink-0
                    hover:opacity-90
                    transition-opacity
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

                {activeTool === "recurring" && (
                  <RecurringExpensePanel
                    recurringExpenses={recurringExpenses}
                    recurringName={recurringName}
                    setRecurringName={setRecurringName}
                    recurringAmount={recurringAmount}
                    setRecurringAmount={setRecurringAmount}
                    recurringDescription={recurringDescription}
                    setRecurringDescription={setRecurringDescription}
                    recurringCategory={recurringCategory}
                    setRecurringCategory={setRecurringCategory}
                    recurringRepeatDay={recurringRepeatDay}
                    setRecurringRepeatDay={setRecurringRepeatDay}
                    recurringIsActive={recurringIsActive}
                    setRecurringIsActive={setRecurringIsActive}
                    recurringEditingId={recurringEditingId}
                    setRecurringEditingId={setRecurringEditingId}
                    recurringLoading={recurringLoading}
                    recurringError={recurringError}
                    generatedRecurringCount={generatedRecurringCount}
                    categories={categories}
                    refreshRecurringExpenses={fetchRecurringExpenses}
                    saveRecurringExpense={handleSaveRecurringExpense}
                    deleteRecurringExpense={handleDeleteRecurringExpense}
                    startEditRecurringExpense={startEditRecurringExpense}
                    resetRecurringExpenseForm={resetRecurringExpenseForm}
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
                    addIncome={handleAddIncome}
                    startEditIncome={handleStartEditIncome}
                    deleteIncome={handleDeleteIncome}
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
                    addCategory={handleAddCategory}
                    editCategory={editCategory}
                    deleteCategory={handleDeleteCategory}
                    categories={categories}
                  />
                )}

                {activeTool === "records" && (
                  <ExpenseRecordsPanel
                    expenses={expenses}
                    loading={loading}
                    startEdit={handleStartEdit}
                    deleteExpense={handleDeleteExpense}
                  />
                )}
              </div>

            </div>
          </div>

        )}

        <CategoryExpenseSheet
          isOpen={activeCategory !== null}
          categoryId={activeCategory?.categoryId ?? null}
          categoryName={activeCategory?.categoryName ?? ""}
          categoryTotal={activeCategory?.totalAmount ?? 0}
          categoryPercent={activeCategory?.percentage ?? 0}
          selectedMonth={selectedMonth}
          onClose={() => setActiveCategory(null)}
          onEdit={handleStartEdit}
          onDelete={deleteExpense}
        />

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
              grid-cols-4
              gap-2
              py-3
              md:max-w-2xl
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
              active={activeTool === "recurring"}
              onClick={() =>
                toggleTool("recurring")
              }
              icon={CalendarSync}
              label="Repeat"
              description="Monthly"
            />

            <BottomBarButton
              active={activeTool === "categories"}
              onClick={() =>
                toggleTool("categories")
              }
              icon={FolderTree}
              label="Cat"
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

      {showExportModal && exportPayload && (
        <div
          className="
            fixed
            inset-0
            bg-black/80
            flex
            items-center
            justify-center
            z-50
            p-4
          "
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="
              bg-zinc-900
              border
              border-zinc-800
              rounded-3xl
              p-6
              w-full
              max-w-2xl
              max-h-[80vh]
              overflow-y-auto
              flex
              flex-col
              gap-4
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center gap-4">
              <h2 className="text-xl font-bold">Export Data</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-zinc-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <textarea
              value={exportPayload}
              readOnly
              className="
                bg-zinc-800
                border
                border-zinc-700
                rounded-2xl
                p-4
                text-sm
                font-mono
                text-zinc-300
                w-full
                flex-1
                resize-none
                focus:outline-none
                focus:border-zinc-600
              "
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(exportPayload).then(() => {
                    setExportModalCopied(true);
                    setTimeout(() => setExportModalCopied(false), 2000);
                  }).catch(() => {
                    alert('Failed to copy. Please select text and copy manually.');
                  });
                }}
                className={`
                  flex-1
                  rounded-2xl
                  px-4
                  py-3
                  font-bold
                  transition
                  ${
                    exportModalCopied
                      ? "bg-emerald-500 text-black"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }
                `}
              >
                {exportModalCopied ? 'Copied!' : 'Copy Text'}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="
                  flex-1
                  bg-zinc-800
                  text-white
                  rounded-2xl
                  px-4
                  py-3
                  font-bold
                  hover:bg-zinc-700
                  transition
                "
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
        min-w-0
        rounded-2xl
        border
        p-2
        text-left
        transition
        sm:p-3
        md:p-4
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
          min-w-0
          md:justify-center
        "
      >
        <Icon
          size={18}
          className="shrink-0"
        />
        <span
          className="
            min-w-0
            truncate
            text-xs
            font-bold
            leading-none
            sm:text-sm
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
          truncate
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
