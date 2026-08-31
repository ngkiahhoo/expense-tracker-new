"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
} from "react";

import PullToRefresh from "react-simple-pull-to-refresh";

import {
  CalendarDays,
  CalendarSync,
  ChartPie,
  ClipboardList,
  FolderTree,
  Plus,
  Wallet,
} from "lucide-react";

import { useToast } from "@/contexts/ToastContext";
import ActionIconButton from "@/components/ui/ActionIconButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import {
  cn,
  overlayStyles,
  toneStyles,
} from "@/components/ui/styles";
import AnalyticsPanel from "../components/AnalyticsPanel";
import AssetRecordCard from "../components/AssetRecordCard";
import BottomBarButton from "../components/BottomBarButton";
import CategoryPanel from "../components/CategoryPanel";
import ExpensePanel from "../components/ExpensePanel";
import ExpenseRecordsPanel from "../components/ExpenseRecordsPanel";
import IncomePanel from "../components/IncomePanel";
import MetricCard from "../components/MetricCard";
import RecurringExpensePanel from "../components/RecurringExpensePanel";
import CategoryExpenseSheet from "../components/features/analytics/CategoryExpenseSheet";
import ExpenseCategoryBreakdown from "../components/features/analytics/ExpenseCategoryBreakdown";
import useAIExport from "../hooks/useAIExport";
import useAnalytics from "../hooks/useAnalytics";
import useAssets from "../hooks/useAssets";
import useCategories from "../hooks/useCategories";
import useCategoryBreakdown from "../hooks/useCategoryBreakdown";
import useExpenses from "../hooks/useExpenses";
import useIncome from "../hooks/useIncome";
import useRecurringExpenses from "../hooks/useRecurringExpenses";
import useSavedNotes from "../hooks/useSavedNotes";
import type { Currency } from "../types/currency";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import {
  CURRENCIES,
  currencyLabel,
  formatCurrencyAmount,
  getStoredCurrency,
  normalizeCurrency,
} from "../utils/currency";
import { logServiceError } from "../utils/logger";
import { supabase } from "@/lib/supabase";

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

  const [allExpenses, setAllExpenses] =
    useState<Expense[]>([]);

  const [allIncomes, setAllIncomes] =
    useState<Income[]>([]);

  const [activeCurrency, setActiveCurrency] =
    useState<Currency>(() => getStoredCurrency());

  const [activeTool, setActiveTool] =
    useState<BottomTool | null>(null);

  const [showAssetModal, setShowAssetModal] = useState(false);

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
    deleteMonthExpenses,
    startEdit,
    resetExpenseForm,
  } = useExpenses(
    selectedMonth,
    activeCurrency
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
    selectedMonth,
    activeCurrency
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
    selectedMonth,
    currentMonth,
    activeCurrency
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
    incomes,
    activeCurrency
  );

  const assets = useAssets(selectedMonth);

  const activeCurrencyAssets = useMemo(
    () => (assets.assets || []).filter((asset) => normalizeCurrency(asset.currency) === activeCurrency),
    [assets.assets, activeCurrency]
  );

  const activeCurrencyAssetTotal = useMemo(
    () => activeCurrencyAssets.reduce((sum, asset) => sum + Number(asset.current_value || 0), 0),
    [activeCurrencyAssets]
  );

  const balance =
    totalIncome - totalSpending;

  const balancePercent = totalIncome > 0
    ? ((balance / totalIncome) * 100).toFixed(1)
    : "0.0";

  const categoryBreakdown = useCategoryBreakdown(
    expenses,
    categories,
    activeCurrency
  );

  const monthlySeries = useMemo(() => {
    const monthKeys = Array.from(
      new Set([
        ...allExpenses.map((expense) => expense.expense_date?.split("T")[0]?.slice(0, 7) || ""),
        ...allIncomes.map((income) => income.income_date?.split("T")[0]?.slice(0, 7) || ""),
      ].filter(Boolean))
    ).sort((left, right) => left.localeCompare(right));

    return monthKeys.map((monthKey) => {
      const monthExpenses = allExpenses.filter((expense) => {
        const expenseDate = expense.expense_date?.split("T")[0] || "";
        return expenseDate.startsWith(monthKey);
      });

      const monthIncomes = allIncomes.filter((income) => {
        const incomeDate = income.income_date?.split("T")[0] || "";
        return incomeDate.startsWith(monthKey);
      });

      const monthlyIncome = monthIncomes.reduce((sum, income) => sum + Number(income.amount || 0), 0);
      const monthlyExpense = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      return {
        monthKey,
        label: new Date(Number(monthKey.split("-")[0]), Number(monthKey.split("-")[1]) - 1, 1).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        income: monthlyIncome,
        expense: monthlyExpense,
        balance: monthlyIncome - monthlyExpense,
      };
    });
  }, [allExpenses, allIncomes]);

  function handleCurrencyChange(value: string) {
    const nextCurrency: Currency =
      value === "SGD"
        ? "SGD"
        : "MYR";

    setActiveCurrency(nextCurrency);
    window.localStorage.setItem("expense-tracker-currency", nextCurrency);
  }

  const [showExpenseDrilldown, setShowExpenseDrilldown] = useState(false);
  const [drilldownMonth, setDrilldownMonth] = useState<string | null>(null);
  const [drilldownCategoryKey, setDrilldownCategoryKey] = useState<string | null>(null);
  const [drilldownCategoryName, setDrilldownCategoryName] = useState<string | null>(null);
  const [drilldownTypeName, setDrilldownTypeName] = useState<string | null>(null);
  const [exportModalCopied, setExportModalCopied] = useState(false);

  // Use the modal state from the hook
  const showExportModal = showExportModalFromHook;
  const setShowExportModal = setShowExportModalFromHook;

  async function loadAllHistoryData() {
    try {
      const [expensesResponse, incomesResponse] = await Promise.all([
        supabase
          .from("expenses")
          .select("*")
          .eq("currency", activeCurrency)
          .order("expense_date", { ascending: true }),
        supabase
          .from("incomes")
          .select("*")
          .eq("currency", activeCurrency)
          .order("income_date", { ascending: true }),
      ]);

      if (expensesResponse.error) {
        throw expensesResponse.error;
      }

      if (incomesResponse.error) {
        throw incomesResponse.error;
      }

      setAllExpenses((expensesResponse.data as Expense[]) || []);
      setAllIncomes((incomesResponse.data as Income[]) || []);
    } catch (error) {
      logServiceError("Failed to load full monthly history", error);
    }
  }

  useEffect(() => {
    async function loadMonthData() {
      await generateDueRecurringExpenses();

      await Promise.all([
        fetchExpenses(),
        fetchIncome(),
        fetchCategories(),
        fetchRecurringExpenses(),
      ]);

      await loadAllHistoryData();
    }

    void loadMonthData();
    // Fetch callbacks come from local hooks and intentionally refresh when the month changes or the currency changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, activeCurrency]);

  // Auto-generate recurring expenses every hour
  useEffect(() => {
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

    await loadAllHistoryData();
  }

  async function handleSaveExpense() {
    const noteToSave = note;

    const result =
      await saveExpense();

    if (result.success) {
      addSavedNote(
        noteToSave
      );
      await loadAllHistoryData();
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
      await loadAllHistoryData();
      toast.showToast(result.message || "Expense deleted successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to delete expense", "error");
    }
    return result.success;
  }

  async function handleDeleteIncome(id: number) {
    const result = await deleteIncome(id);
    if (result.success) {
      await loadAllHistoryData();
      toast.showToast(result.message || "Income deleted successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to delete income", "error");
    }
  }

  async function handleAddIncome() {
    const result = await addIncome();
    if (result.success) {
      await loadAllHistoryData();
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

  function openExpenseBreakdown() {
    setDrilldownMonth(selectedMonth);
    setDrilldownCategoryKey(null);
    setDrilldownCategoryName(null);
    setDrilldownTypeName(null);
    setShowExpenseDrilldown(true);
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
          app-background
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
              flex
              flex-col
              gap-4
            "
          >

            <div className="flex flex-col gap-4">
              <Card
                className="text-left cursor-pointer"
                variant="info"
                onClick={() => setShowAssetModal(true)}
              >
                <div>
                  <div className="flex items-center gap-2 text-zinc-400 mb-3">
                    <Wallet size={18} />
                    Total Assets
                  </div>
                  <div className="space-y-2">
                    <div className="block w-full rounded-xl border border-cyan-500/20 bg-black/30 px-3 py-3 text-left transition hover:border-cyan-300">
                      <div className="text-2xl font-bold text-cyan-400">
                        {formatCurrencyAmount(
                          activeCurrencyAssetTotal,
                          activeCurrency
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">
                    {activeCurrencyAssets.length} record{activeCurrencyAssets.length === 1 ? "" : "s"}
                  </p>
                </div>
              </Card>

              <Card
                variant="panel"
                padding="none"
                className="flex h-full min-h-[132px] flex-col p-4 sm:p-5 md:min-h-[150px]"
              >
                <div className="flex items-center gap-2 text-zinc-400">
                  <CalendarDays size={18}/>
                  <span>
                    View Month
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_96px] gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                  <Select
                    value={selectedMonth}
                    onChange={(e) =>
                      setSelectedMonth(
                        e.target.value
                      )
                    }
                    className="w-full text-base sm:text-lg"
                  >
                    {months.map((month) => (
                      <option
                        key={month}
                        value={month}
                        className="bg-black"
                      >
                        {month === currentMonth
                          ? `${month} (Current)`
                          : month}
                      </option>
                    ))}
                  </Select>

                  <Select
                    value={activeCurrency}
                    onChange={(event) => handleCurrencyChange(event.target.value)}
                    className="w-full text-base sm:text-lg"
                    title="Currency for new records and current dashboard"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currencyLabel(currency)}
                      </option>
                    ))}
                  </Select>
                </div>
              </Card>
            </div>

            {error && (

              <div
                className={cn(
                  "rounded-2xl border p-4 text-sm text-red-200",
                  toneStyles.danger.subtleSurface
                )}
              >
                {error}
              </div>

            )}

            <div className="flex flex-col gap-4">
              <MetricCard
                variant="success"
                tone="success"
                icon={Wallet}
                label="Monthly Income"
                amount={totalIncome}
                currency={activeCurrency}
                onAmountClick={openIncomeCrud}
              />

              <MetricCard
                variant="danger"
                tone="danger"
                label="Total Spending"
                amount={totalSpending}
                currency={activeCurrency}
                helper={`${spendingPercent}% of income`}
                onAmountClick={openExpenseBreakdown}
              />

              <MetricCard
                variant="balance"
                tone="balance"
                label="Balance"
                amount={balance}
                currency={activeCurrency}
                helper={`${balancePercent}% of income`}
              />
            </div>

            <section className="w-full">
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

                  <Button
                    onClick={handleCopyAIExport}
                    disabled={exportLoading}
                    variant={exportCopied ? "secondary" : "primary"}
                    size="sm"
                  >
                    {exportLoading
                      ? "Copying..."
                      : exportCopied
                      ? "Copied!"
                      : "Export for AI"}
                  </Button>
                </div>
              </div>

              <AnalyticsPanel
                analytics={analytics}
                totalIncome={totalIncome}
                currency={activeCurrency}
              />
            </section>

            <section className="w-full">
              <ExpenseCategoryBreakdown
                breakdown={categoryBreakdown}
                loading={loading}
                onSelectCategory={(item) => {
                  setDrilldownCategoryKey(`${item.categoryId ?? "uncategorized"}:${item.categoryName}`);
                  setDrilldownCategoryName(item.categoryName);
                  setDrilldownTypeName(item.expenses[0]?.categories?.types?.name || null);
                  setDrilldownMonth(selectedMonth);
                  setShowExpenseDrilldown(true);
                }}
                onSelectMonthExpense={(monthKey) => {
                  setDrilldownCategoryKey(null);
                  setDrilldownCategoryName(null);
                  setDrilldownTypeName(null);
                  setDrilldownMonth(monthKey);
                  setShowExpenseDrilldown(true);
                }}
                monthlySeries={monthlySeries}
                currency={activeCurrency}
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
              className={cn(
                "mx-auto max-h-[68vh] w-full max-w-md overflow-y-auto md:max-w-2xl md:max-h-[72vh] lg:max-w-none lg:max-h-full",
                overlayStyles.sheetPanel,
                "rounded-3xl"
              )}
            >

              <div className={overlayStyles.stickyHeader}>
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

                <ActionIconButton
                  kind="close"
                  onClick={() =>
                    setActiveTool(null)
                  }
                  title="Close panel"
                  aria-label="Close panel"
                />
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
                    currency={activeCurrency}
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
                    currency={activeCurrency}
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
                    currency={activeCurrency}
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
                    deleteMonthExpenses={deleteMonthExpenses}
                    selectedMonth={selectedMonth}
                  />
                )}
              </div>

            </div>
          </div>

        )}

        {showExpenseDrilldown && (
          <CategoryExpenseSheet
            isOpen={showExpenseDrilldown}
            selectedMonth={drilldownMonth ?? selectedMonth}
            currency={activeCurrency}
            expenses={allExpenses}
            categories={categories}
            initialCategoryKey={drilldownCategoryKey}
            initialCategoryName={drilldownCategoryName}
            initialTypeName={drilldownTypeName}
            onClose={() => {
              setShowExpenseDrilldown(false);
              setDrilldownMonth(null);
              setDrilldownCategoryKey(null);
              setDrilldownCategoryName(null);
              setDrilldownTypeName(null);
            }}
            onEdit={handleStartEdit}
            onDelete={handleDeleteExpense}
          />
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

      {showAssetModal && (
  <div className={overlayStyles.backdrop}>
    <div className={cn(overlayStyles.modalPanel, "max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto")}>
      
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold">
            Asset Details
          </h3>

          <p className="text-sm text-zinc-400 mt-1">
            All tracked asset records. Edit values or create new assets here.
          </p>
        </div>

        <ActionIconButton
          kind="close"
          onClick={() => setShowAssetModal(false)}
          title="Close asset details"
          aria-label="Close asset details"
        />
      </div>

      <div className="mt-5 space-y-4">
        {assets.loading ? (
          <div className="text-zinc-400">
            Loading assets...
          </div>
        ) : assets.assets && assets.assets.length > 0 ? (
          assets.assets.map((a) => (
            <AssetRecordCard
              key={a.id}
              asset={a}
              onMainChange={async (asset, isMain) => {
                const res = await assets.setMainAsset(asset.id, isMain);
                if (res.success) {
                  toast.showToast(
                    isMain ? "Main asset selected." : "Main asset cleared.",
                    "success"
                  );
                } else {
                  toast.showToast(res.error || "Failed to update main asset.", "error");
                }
              }}
              onEdit={assets.startEditAsset}
              onDelete={async (asset) => {
                const res =
                  await assets.deleteAssetById(asset.id);

                if (res.success) {
                  toast.showToast(
                    "Asset deleted.",
                    "success"
                  );
                } else {
                  toast.showToast(
                    res.error || "Failed to delete",
                    "error"
                  );
                }
              }}
            />
          ))
        ) : (
          <div className="text-zinc-400">
            No assets yet.
          </div>
        )}

        <div className="mt-4 border-t border-zinc-800 pt-4">
          <h3 className="font-bold">
            Create / Edit Asset
          </h3>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Input
              value={assets.assetName}
              onChange={(e) =>
                assets.setAssetName(e.target.value)
              }
              placeholder="Asset name"
            />

            <Input
              type="number"
              value={assets.assetValue}
              onChange={(e) =>
                assets.setAssetValue(e.target.value)
              }
              placeholder="Current value"
            />

            <Select
              value={assets.assetCurrency}
              onChange={(e) =>
                assets.setAssetCurrency(e.target.value as Currency)
              }
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {currencyLabel(c)}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-3">
            <Textarea
              value={assets.assetNote}
              onChange={(e) =>
                assets.setAssetNote(e.target.value)
              }
              placeholder="Note (optional)"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              onClick={async () => {
                const res =
                  await assets.saveAsset();

                if (res.success) {
                  toast.showToast(
                    "Asset saved.",
                    "success"
                  );
                } else {
                  toast.showToast(
                    res.error || "Failed to save asset",
                    "error"
                  );
                }
              }}
              variant="primary"
            >
              {assets.assetEditingId
                ? "Update Asset"
                : "Create Asset"}
            </Button>

            {assets.assetEditingId && (
              <Button
                onClick={() =>
                  assets.resetAssetForm()
                }
                variant="outline"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  </div>
)}

      {showExportModal && exportPayload && (
        <div
          className={overlayStyles.backdrop}
          onClick={() => setShowExportModal(false)}
        >
          <Card
            variant="default"
            padding="lg"
            className="flex max-h-[80vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Export Data</h2>
              <ActionIconButton
                kind="close"
                onClick={() => setShowExportModal(false)}
                title="Close export modal"
                aria-label="Close export modal"
              />
            </div>

            <Textarea
              value={exportPayload}
              readOnly
              fieldSize="md"
              className="min-h-[320px] flex-1 bg-zinc-800 font-mono text-zinc-300"
            />

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(exportPayload).then(() => {
                    setExportModalCopied(true);
                    setTimeout(() => setExportModalCopied(false), 2000);
                  }).catch(() => {
                    alert('Failed to copy. Please select text and copy manually.');
                  });
                }}
                variant={exportModalCopied ? "secondary" : "primary"}
                size="lg"
                className="flex-1"
              >
                {exportModalCopied ? 'Copied!' : 'Copy Text'}
              </Button>
              <ActionIconButton
                kind="close"
                onClick={() => setShowExportModal(false)}
                title="Close export modal"
                aria-label="Close export modal"
              />
            </div>
          </Card>
        </div>
      )}

    </PullToRefresh>
  );
}
