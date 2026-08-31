"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FocusEvent,
} from "react";

import PullToRefresh from "react-simple-pull-to-refresh";
import { Wallet } from "lucide-react";

import { useToast } from "@/contexts/ToastContext";
import {
  cn,
  toneStyles,
} from "@/components/ui/styles";
import AssetDetailsModal from "../components/AssetDetailsModal";
import BottomActionBar, {
  type BottomTool,
} from "../components/BottomActionBar";
import CategoryPanel from "../components/CategoryPanel";
import DashboardAnalyticsSection from "../components/DashboardAnalyticsSection";
import DashboardSummarySection from "../components/DashboardSummarySection";
import ExportModal from "../components/ExportModal";
import ExpensePanel from "../components/ExpensePanel";
import ExpenseRecordsPanel from "../components/ExpenseRecordsPanel";
import IncomePanel from "../components/IncomePanel";
import MetricCard from "../components/MetricCard";
import QuickActionSheet from "../components/QuickActionSheet";
import RecurringExpensePanel from "../components/RecurringExpensePanel";
import CategoryExpenseSheet from "../components/features/analytics/CategoryExpenseSheet";
import useAIExport from "../hooks/useAIExport";
import useAnalytics from "../hooks/useAnalytics";
import useAssets from "../hooks/useAssets";
import useCategories from "../hooks/useCategories";
import useCategoryBreakdown from "../hooks/useCategoryBreakdown";
import useDashboardHistory from "../hooks/useDashboardHistory";
import useExpenses from "../hooks/useExpenses";
import useIncome from "../hooks/useIncome";
import useMonthOptions from "../hooks/useMonthOptions";
import useMonthlySeries from "../hooks/useMonthlySeries";
import useRecurringExpenses from "../hooks/useRecurringExpenses";
import useSavedNotes from "../hooks/useSavedNotes";
import type { Currency } from "../types/currency";
import type { Expense } from "../types/expense";
import type { Income } from "../types/income";
import {
  getStoredCurrency,
  normalizeCurrency,
} from "../utils/currency";

const fullAIExportOptions = {
  includeAssets:true,
  includeIncomes:true,
  includeExpenses:true,
  includeMonthlySummary:true,
  includeCategories:true,
  includeAIPrompt:true,
};

export default function Home() {

  const toast = useToast();

  const {
    currentMonth,
    months,
  } = useMonthOptions();

  const [selectedMonth, setSelectedMonth] =
    useState(currentMonth);

  const [activeCurrency, setActiveCurrency] =
    useState<Currency>(() => getStoredCurrency());

  const {
    allExpenses,
    allIncomes,
    fetchDashboardHistory,
  } = useDashboardHistory(activeCurrency);

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

  const monthlySeries = useMonthlySeries(
    allExpenses,
    allIncomes
  );

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

  const showExportModal = showExportModalFromHook;
  const setShowExportModal = setShowExportModalFromHook;

  const refreshAll = useCallback(async () => {
    await generateDueRecurringExpenses();

    await Promise.all([
      fetchExpenses(),
      fetchIncome(),
      fetchCategories(),
      fetchRecurringExpenses(),
    ]);

    await fetchDashboardHistory();
  }, [
    fetchCategories,
    fetchDashboardHistory,
    fetchExpenses,
    fetchIncome,
    fetchRecurringExpenses,
    generateDueRecurringExpenses,
  ]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const interval = setInterval(
      async () => {
        const createdCount = await generateDueRecurringExpenses();
        if (createdCount > 0) {
          await fetchExpenses();
        }
      },
      60 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [fetchExpenses, generateDueRecurringExpenses]);

  async function handleSaveExpense() {
    const noteToSave = note;

    const result =
      await saveExpense();

    if (result.success) {
      addSavedNote(
        noteToSave
      );
      await fetchDashboardHistory();
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
      await fetchDashboardHistory();
      toast.showToast(result.message || "Expense deleted successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to delete expense", "error");
    }
    return result.success;
  }

  async function handleDeleteIncome(id: number) {
    const result = await deleteIncome(id);
    if (result.success) {
      await fetchDashboardHistory();
      toast.showToast(result.message || "Income deleted successfully", "success");
    } else {
      toast.showToast(result.error || "Failed to delete income", "error");
    }
  }

  async function handleAddIncome() {
    const result = await addIncome();
    if (result.success) {
      await fetchDashboardHistory();
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

  function closeExpenseDrilldown() {
    setShowExpenseDrilldown(false);
    setDrilldownMonth(null);
    setDrilldownCategoryKey(null);
    setDrilldownCategoryName(null);
    setDrilldownTypeName(null);
  }

  function handleStartEdit(
    expense: Expense
  ) {
    closeExpenseDrilldown();
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

    <>
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

            <DashboardSummarySection
              activeCurrency={activeCurrency}
              assetCount={activeCurrencyAssets.length}
              assetTotal={activeCurrencyAssetTotal}
              currentMonth={currentMonth}
              months={months}
              onAssetClick={() => setShowAssetModal(true)}
              onCurrencyChange={handleCurrencyChange}
              onMonthChange={setSelectedMonth}
              selectedMonth={selectedMonth}
            />

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

            <DashboardAnalyticsSection
              analytics={analytics}
              breakdown={categoryBreakdown}
              currency={activeCurrency}
              exportCopied={exportCopied}
              exportError={exportError}
              exportLoading={exportLoading}
              loading={loading}
              monthlySeries={monthlySeries}
              onCopyAIExport={handleCopyAIExport}
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
              totalIncome={totalIncome}
            />

          </div>

        </main>

        {activeTool && (
          <QuickActionSheet
            title={sheetTitle}
            widthClass={sheetWidthClass}
            onClose={() => setActiveTool(null)}
            onFocusCapture={handlePopupFocus}
          >
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
          </QuickActionSheet>
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
            onClose={closeExpenseDrilldown}
            onEdit={handleStartEdit}
            onDelete={handleDeleteExpense}
          />
        )}

        <BottomActionBar
          activeTool={activeTool}
          onToggle={toggleTool}
        />

      </div>

    </PullToRefresh>

    {showAssetModal && (
      <AssetDetailsModal
        assets={assets}
        onClose={() => setShowAssetModal(false)}
        onToast={toast.showToast}
      />
    )}

    {showExportModal && exportPayload && (
      <ExportModal
        payload={exportPayload}
        onClose={() => setShowExportModal(false)}
        onCopyError={(message) => toast.showToast(message, "error")}
      />
    )}
    </>
  );
}
