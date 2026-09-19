"use client";

import {
  Suspense,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { ChevronDown, Pencil, Plus, Save, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import useBookkeepingHierarchy from "@/hooks/useBookkeepingHierarchy";
import { reconcileBookkeepingDuplicates, withoutBookkeepingHierarchy, withBookkeepingHierarchy } from "@/utils/bookkeepingExpenseHierarchy";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import OverlayPortal from "@/components/ui/OverlayPortal";
import useFutureExpensePlans from "@/hooks/useFutureExpensePlans";
import useThemePreference from "@/hooks/useThemePreference";
import useUnsavedChanges from "@/hooks/useUnsavedChanges";
import type { Currency } from "@/types/currency";
import type {
  FutureExpenseItem,
  FutureExpenseLibrary,
  FutureExpensePlan,
} from "@/types/futureExpense";
import {
  duplicateExpensePlan,
  newExpenseItem,
  newExpensePlan,
  ordered,
} from "@/utils/futureExpense";
import {
  livingPlanCashFlow,
  projectLivingExpenses,
} from "@/utils/livingExpense";

const createOption = "__create_plan__";
const label = (name: string) =>
  name ? `${name[0].toUpperCase()}${name.slice(1)}` : "Uncategorized";

function ToggleRow({
  children,
  isOpen,
  onClick,
}: {
  children: ReactNode;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronDown
        size={18}
        className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  );
}

export default function FutureExpensePlansPage() {
  return (
    <Suspense fallback={<p role="status">Loading plan…</p>}>
      <LivingPlanEditor />
    </Suspense>
  );
}

function LivingPlanEditor() {
  const searchParams = useSearchParams();
  const {
    library: savedLibrary,
    saveLibrary,
    storageError,
    loading,
    status,
    retry,
    hasBackup,
    downloadBackup,
  } = useFutureExpensePlans();
  const bookkeeping = useBookkeepingHierarchy();
  const reconciledLibrary = bookkeeping.data
    ? reconcileBookkeepingDuplicates(savedLibrary, bookkeeping.data.types, bookkeeping.data.categories)
    : savedLibrary;
  useEffect(() => {
    if (!bookkeeping.data || JSON.stringify(savedLibrary) === JSON.stringify(reconciledLibrary)) return;
    try { saveLibrary(reconciledLibrary); } catch { /* Surface existing cloud error in the editor. */ }
  }, [bookkeeping.data, reconciledLibrary, saveLibrary, savedLibrary]);
  const library = bookkeeping.data
    ? withBookkeepingHierarchy(
        reconciledLibrary,
        bookkeeping.data.types,
        bookkeeping.data.categories,
      )
    : savedLibrary;
  const types = ordered(
    library.types.filter((type) => type.id.startsWith("bookkeeping-type:")),
  );
  const categories = library.categories.filter((category) =>
    category.id.startsWith("bookkeeping-category:"),
  );
  const { theme } = useThemePreference();
  const [selected, select] = useState("");
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<FutureExpenseItem[]>([]);
  useUnsavedChanges(drafts.length > 0);
  const [openTypes, setOpenTypes] = useState<Set<string>>(() => new Set());
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(),
  );
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set());
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const plan =
    library.plans.find(
      (value) => value.id === (selected || searchParams.get("plan")),
    ) || library.plans[0];
  const months = plan?.months_to_project ?? 1;
  const result =
    plan && bookkeeping.data && !bookkeeping.error
      ? projectLivingExpenses(plan, library, months)
      : null;
  const cashFlow = plan ? livingPlanCashFlow(plan, library) : null;
  const money = (amount: number) =>
    new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: plan?.currency || "MYR",
    }).format(amount);
  const toggle = (setter: Dispatch<SetStateAction<Set<string>>>, key: string) =>
    setter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  function save(next: FutureExpenseLibrary) {
    if (loading || storageError || !bookkeeping.data || bookkeeping.error) {
      setError("Wait for bookkeeping categories to load before editing.");
      return false;
    }
    try {
      saveLibrary(withoutBookkeepingHierarchy(next));
      setError("");
      return true;
    } catch (cause) {
      setError((cause as Error).message);
      return false;
    }
  }
  function update(change: Partial<FutureExpensePlan>) {
    if (plan)
      save({
        ...library,
        plans: library.plans.map((value) =>
          value.id === plan.id
            ? { ...value, ...change, confirmed: false }
            : value,
        ),
      });
  }
  function editItem(
    id: string,
    change: Partial<FutureExpenseItem>,
    draft = false,
  ) {
    const edit = (item: FutureExpenseItem) => ({
      ...item,
      ...change,
      updated_at: new Date().toISOString(),
    });
    if (draft)
      setDrafts((current) =>
        current.map((item) => (item.id === id ? edit(item) : item)),
      );
    else if (plan)
      update({
        items: plan.items.map((item) => (item.id === id ? edit(item) : item)),
      });
  }
  function createPlan() {
    const next = newExpensePlan(
      plan?.currency || "MYR",
      "My Future Living Cost",
    );
    if (save({ ...library, plans: [...library.plans, next] })) {
      select(next.id);
      setDrafts([]);
    }
  }
  function saveDraft(item: FutureExpenseItem) {
    if (!plan) return;
    if (!item.name.trim() || !item.type_id || !item.category_id) {
      setError("Enter an expense name, type and category before saving.");
      return;
    }
    if (
      save({
        ...library,
        plans: library.plans.map((value) =>
          value.id === plan.id
            ? { ...value, confirmed: false, items: [...value.items, item] }
            : value,
        ),
      })
    ) {
      setDrafts((current) => current.filter((value) => value.id !== item.id));
      setOpenItems((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }
  function selectPlan(value: string) {
    if (value === createOption) createPlan();
    else {
      select(value);
      setDrafts([]);
      setOpenTypes(new Set());
      setOpenCategories(new Set());
      setOpenItems(new Set());
    }
  }
  function itemForm(item: FutureExpenseItem, draft = false) {
    return (
      <div className="space-y-3 border-t border-slate-200 px-3 pb-3 pt-4 dark:border-slate-700">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Expense name
            <Input
              aria-label="Expense name"
              value={item.name}
              onChange={(event) =>
                editItem(item.id, { name: event.target.value }, draft)
              }
            />
          </label>
          <label className="text-sm">
            Monthly amount
            <Input
              aria-label="Monthly amount"
              type="number"
              min="0"
              max="1000000000000"
              step="0.01"
              value={item.amount}
              onChange={(event) => {
                const amount = Number(event.target.value);
                if (Number.isFinite(amount) && amount >= 0 && amount <= 1e12)
                  editItem(item.id, { amount }, draft);
              }}
            />
          </label>
          <label className="text-sm">
            Currency
            <Select
              aria-label="Currency"
              value={item.currency}
              onChange={(event) =>
                editItem(
                  item.id,
                  { currency: event.target.value as Currency },
                  draft,
                )
              }
            >
              <option>MYR</option>
              <option>SGD</option>
            </Select>
          </label>
          <label className="text-sm">
            Expense type
            <Select
              aria-label="Expense type"
              value={item.type_id || ""}
              onChange={(event) =>
                editItem(
                  item.id,
                  {
                    type_id: event.target.value || null,
                    category_id: null,
                    source_category_id: undefined,
                  },
                  draft,
                )
              }
            >
              <option value="">Choose type</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {label(type.name)}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm">
            Expense category
            <Select
              aria-label="Expense category"
              value={item.category_id || ""}
              onChange={(event) =>
                editItem(
                  item.id,
                  {
                    category_id: event.target.value || null,
                    source_category_id: undefined,
                  },
                  draft,
                )
              }
            >
              <option value="">Choose category</option>
              {ordered(
                categories.filter(
                  (category) => category.type_id === item.type_id,
                ),
              ).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm">
            Note
            <Input
              aria-label="Note"
              value={item.note}
              onChange={(event) =>
                editItem(item.id, { note: event.target.value }, draft)
              }
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(event) =>
                editItem(item.id, { enabled: event.target.checked }, draft)
              }
            />
            Include expense
          </label>
          {draft ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveDraft(item)}>
                <Save size={16} />
                Save expense
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDrafts((current) =>
                    current.filter((value) => value.id !== item.id),
                  )
                }
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (window.confirm(`Delete ${item.name}?`))
                  update({
                    items: plan!.items.filter((value) => value.id !== item.id),
                  });
              }}
            >
              Delete expense
            </Button>
          )}
        </div>
      </div>
    );
  }
  function itemRow(item: FutureExpenseItem, draft = false) {
    const expanded = openItems.has(item.id);
    return (
      <article
        key={item.id}
        aria-label={`Expense ${item.name}`}
        className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
      >
        <ToggleRow
          isOpen={expanded}
          onClick={() => toggle(setOpenItems, item.id)}
        >
          <span className="flex justify-between gap-3">
            <span className="font-medium">{item.name || "New expense"}</span>
            <span>{money(item.amount)}</span>
          </span>
        </ToggleRow>
        {expanded && itemForm(item, draft)}
      </article>
    );
  }
  const itemsFor = (typeId: string) =>
    plan?.items.filter((item) => item.type_id === typeId) || [];
  return (
    <main
      className={`expense-plans ${theme === "dark" ? "expense-dark bg-slate-950 text-slate-100" : "light-theme bg-slate-50 text-slate-900"} min-h-screen p-4 sm:p-8`}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold">Living Cost Plan</h1>
        </header>
        <p role="status" className="sr-only">
          {status}
        </p>
        {storageError && <Button onClick={retry}>Retry sync</Button>}
        {hasBackup && (
          <Button variant="secondary" onClick={downloadBackup}>
            Download unsynced backup
          </Button>
        )}
        <div className="space-y-6">
          {!bookkeeping.data && !bookkeeping.error && (
            <p role="status" className="text-sm text-slate-500">
              Loading bookkeeping types and categories…
            </p>
          )}
          {bookkeeping.error && (
            <p role="alert" className="text-sm text-amber-600">
              {bookkeeping.error}
            </p>
          )}
          {(storageError || error) && (
            <p role="alert" className="rounded-xl border border-amber-400 p-4">
              {storageError || error}
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 text-sm">
              Expense plan
              <Select
                value={plan?.id || ""}
                onChange={(event) => selectPlan(event.target.value)}
              >
                {!plan && (
                  <option value="">
                    {loading
                      ? "Loading plans…"
                      : storageError
                        ? "Plans unavailable"
                        : "No plans yet"}
                  </option>
                )}
                {library.plans.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.name || "Unnamed plan"}
                  </option>
                ))}
                <option value={createOption}>＋ Create plan</option>
              </Select>
            </label>
            {plan && (
              <Button variant="secondary" onClick={() => setEditingPlan(true)}>
                <Pencil size={16} />
                Edit plan
              </Button>
            )}
          </div>
          {!plan ? (
            loading || storageError ? null : (
              <div className="glass-surface rounded-2xl p-6">
                <h2 className="text-xl font-medium">
                  Choose “Create plan” from the plan menu to begin.
                </h2>
              </div>
            )
          ) : (
            <>
              <section
                aria-label="Projection"
                className="glass-surface overflow-hidden rounded-2xl"
              >
                <ToggleRow
                  isOpen={projectionOpen}
                  onClick={() => setProjectionOpen((value) => !value)}
                >
                  <span className="grid gap-5 p-3 sm:grid-cols-3">
                    <span>
                      <span className="block text-sm text-slate-500">
                        Total Monthly Expenses
                      </span>
                      <output
                        aria-label="Total monthly cost"
                        className="mt-2 block text-3xl font-semibold"
                      >
                        {result?.monthly == null ? "—" : money(result.monthly)}
                      </output>
                    </span>
                    <span>
                      <span className="block text-sm text-slate-500">
                        Months to project
                      </span>
                      <span className="mt-2 block text-xl font-semibold">
                        {months}
                      </span>
                    </span>
                    <span>
                      <span className="block text-sm text-slate-500">
                        Money required
                      </span>
                      <output
                        aria-label="Money required"
                        className="mt-2 block text-3xl font-semibold text-teal-600 dark:text-teal-300"
                      >
                        {result?.required == null
                          ? "—"
                          : money(result.required)}
                      </output>
                    </span>
                  </span>
                </ToggleRow>
                {projectionOpen && (
                  <div className="grid gap-5 border-t border-slate-200 p-6 dark:border-slate-700 sm:grid-cols-3">
                    <label className="text-sm">
                      Months to project
                      <Input
                        aria-label="Months to project"
                        type="number"
                        min="1"
                        max="1200"
                        step="1"
                        value={months}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (
                            Number.isInteger(value) &&
                            value >= 1 &&
                            value <= 1200
                          )
                            update({ months_to_project: value });
                        }}
                      />
                    </label>
                    <label className="text-sm">
                      Expected Monthly Income
                      <Input
                        type="number"
                        min="0"
                        max="1000000000000"
                        step="0.01"
                        value={plan.monthly_income ?? 0}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (
                            Number.isFinite(value) &&
                            value >= 0 &&
                            value <= 1e12
                          )
                            update({ monthly_income: value });
                        }}
                      />
                    </label>
                    <div>
                      <p className="text-sm">Expected Monthly Saving</p>
                      <output className="mt-2 block text-2xl font-semibold">
                        {cashFlow?.saving == null
                          ? "Unavailable"
                          : money(cashFlow.saving)}{" "}
                        / month
                      </output>
                    </div>
                    <div>
                      <p className="text-sm">Savings Rate</p>
                      <output className="mt-2 block text-2xl font-semibold">
                        {cashFlow?.savingsRate == null
                          ? "N/A"
                          : `${cashFlow.savingsRate.toFixed(1)}%`}
                      </output>
                    </div>
                    {!!result?.errors.length && (
                      <div
                        role="alert"
                        className="space-y-1 text-sm text-amber-700 dark:text-amber-300 sm:col-span-3"
                      >
                        {result.errors.map((message) => (
                          <p key={message}>{message}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
              <section aria-label="Monthly expenses" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Monthly expenses</h2>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      plan &&
                      setDrafts((current) => [...current, newExpenseItem(plan)])
                    }
                  >
                    <Plus size={16} />
                    Add expense
                  </Button>
                </div>
                {drafts.map((item) => itemRow(item, true))}
                {types
                  .filter((type) => itemsFor(type.id).length > 0)
                  .map((type) => {
                    const typeOpen = openTypes.has(type.id);
                    return (
                      <section
                        key={type.id}
                        className="glass-surface overflow-hidden rounded-2xl"
                      >
                        <ToggleRow
                          isOpen={typeOpen}
                          onClick={() => toggle(setOpenTypes, type.id)}
                        >
                          <span className="flex justify-between gap-3 p-2 text-lg font-semibold">
                            <span>{label(type.name)}</span>
                            <span>
                              {result?.monthly == null
                                ? "—"
                                : money(result.byType[type.id] || 0)}
                            </span>
                          </span>
                        </ToggleRow>
                        {typeOpen && (
                          <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-700">
                            {ordered(
                              categories.filter(
                                (category) =>
                                  category.type_id === type.id &&
                                  itemsFor(type.id).some(
                                    (item) => item.category_id === category.id,
                                  ),
                              ),
                            ).map((category) => {
                              const key = `${type.id}:${category.id}`;
                              const categoryOpen = openCategories.has(key);
                              return (
                                <div
                                  key={category.id}
                                  className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                                >
                                  <ToggleRow
                                    isOpen={categoryOpen}
                                    onClick={() =>
                                      toggle(setOpenCategories, key)
                                    }
                                  >
                                    <span className="flex justify-between gap-3">
                                      <span className="font-medium">
                                        {category.name}
                                      </span>
                                      <span>
                                        {result?.monthly == null
                                          ? "—"
                                          : money(
                                              result.byCategory[category.id] ||
                                                0,
                                            )}
                                      </span>
                                    </span>
                                  </ToggleRow>
                                  {categoryOpen && (
                                    <div className="space-y-2 border-t border-slate-200 p-2 dark:border-slate-700">
                                      {itemsFor(type.id)
                                        .filter(
                                          (item) =>
                                            item.category_id === category.id,
                                        )
                                        .map((item) => itemRow(item))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
              </section>
            </>
          )}
        </div>
      </div>
      {plan && editingPlan && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-md"
            onClick={() => setEditingPlan(false)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Edit plan"
              className="glass-surface w-full max-w-xl rounded-3xl border border-white/15 p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">Edit plan</h2>
                <button
                  type="button"
                  aria-label="Close edit plan"
                  onClick={() => setEditingPlan(false)}
                >
                  <X />
                </button>
              </div>
              <div className="space-y-4">
                <label className="block text-sm">
                  Plan name
                  <Input
                    value={plan.name}
                    onChange={(event) => update({ name: event.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  Base currency
                  <Select
                    value={plan.currency}
                    onChange={(event) =>
                      update({ currency: event.target.value as Currency })
                    }
                  >
                    <option>MYR</option>
                    <option>SGD</option>
                  </Select>
                </label>
                <label className="block text-sm">
                  Description
                  <Textarea
                    value={plan.description}
                    onChange={(event) =>
                      update({ description: event.target.value })
                    }
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const copy = duplicateExpensePlan(plan, library);
                      if (
                        save({ ...library, plans: [...library.plans, copy] })
                      ) {
                        select(copy.id);
                        setEditingPlan(false);
                      }
                    }}
                  >
                    Duplicate plan
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete ${plan.name} and its expense items?`,
                        ) &&
                        save({
                          ...library,
                          plans: library.plans.filter(
                            (value) => value.id !== plan.id,
                          ),
                        })
                      ) {
                        select("");
                        setEditingPlan(false);
                      }
                    }}
                  >
                    Delete plan
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </OverlayPortal>
      )}
    </main>
  );
}
