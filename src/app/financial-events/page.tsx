"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { overlayStyles } from "@/components/ui/styles";
import useFinancialEvents from "@/hooks/useFinancialEvents";
import useEventCurrencies from "@/hooks/useEventCurrencies";
import useFrankfurterCurrencies from "@/hooks/useFrankfurterCurrencies";
import type {
  FinancialEvent,
  FinancialEventItem,
} from "@/types/financialEvent";
import {
  eventDays,
  eventImpact,
  eventTotal,
  newFinancialEvent,
  newFinancialEventItem,
} from "@/utils/financialEvents";
import { formatCurrencyAmount } from "@/utils/currency";
import { getDailyExchangeRate } from "@/utils/exchangeRates";
import { supabase } from "@/lib/supabase";
import { createExpense } from "@/services/expenseService";
import { createIncome } from "@/services/incomeService";

function formatEventCurrency(amount: number, currency: string) {
  return (
    (currency === "MYR" ? "RM" : currency) +
    " " +
    Number(amount || 0).toFixed(2)
  );
}

function NativeImpact({ event }: { event: FinancialEvent }) {
  const [rate, setRate] = useState<number | null>(
    event.completedAt
      ? (event.appliedMyrRate ?? null)
      : event.currency === "MYR"
        ? 1
        : null,
  );
  useEffect(() => {
    let alive = true;
    if (!event.completedAt && event.currency !== "MYR")
      void getDailyExchangeRate(event.currency, "MYR")
        .then((value) => {
          if (alive) setRate(value);
        })
        .catch(() => {
          if (alive) setRate(null);
        });
    return () => {
      alive = false;
    };
  }, [event.completedAt, event.currency]);
  const total = eventTotal(event);
  const sign = event.kind === "income" ? "+" : "-";
  const myrAmount = event.completedAt
    ? event.appliedMyrAmount
    : rate === null
      ? null
      : total * rate;
  return (
    <p
      className={
        "text-xl font-bold " +
        (event.kind === "income" ? "text-emerald-500" : "text-red-500")
      }
    >
      {sign}
      {formatEventCurrency(total, event.currency)}
        {myrAmount !== null &&
          myrAmount !== undefined &&
          event.currency !== "MYR" && (
          <span className="ml-2 text-base font-normal text-slate-400">
            ({sign}
            {formatCurrencyAmount(myrAmount, "MYR")})
          </span>
        )}
    </p>
  );
}

function EventForm({
  event,
  currencies,
  onSave,
  onCancel,
}: {
  event: FinancialEvent;
  currencies: string[];
  onSave: (event: FinancialEvent) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(event);
  const [error, setError] = useState("");
  const [myrRate, setMyrRate] = useState<number | null>(
    event.currency === "MYR" ? 1 : null,
  );
  const [rateError, setRateError] = useState("");
  const editItem = (id: string, change: Partial<FinancialEventItem>) =>
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...change } : item,
      ),
    }));
  function submit(form: FormEvent) {
    form.preventDefault();
    if (
      !draft.name.trim() ||
      !draft.items.length ||
      draft.items.some(
        (item) =>
          !item.name.trim() || !Number.isFinite(item.amount) || item.amount < 0,
      ) ||
      !eventDays(draft)
    ) {
      setError(
        "Enter an event name, valid date range, and a non-negative amount for every item.",
      );
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      updatedAt: new Date().toISOString(),
    });
  }
  const days = eventDays(draft);
  const total = eventTotal(draft);
  const impact = eventImpact(draft);
  useEffect(() => {
    let alive = true;
    if (draft.currency === "MYR")
      return () => {
        alive = false;
      };
    void getDailyExchangeRate(draft.currency, "MYR")
      .then((rate) => {
        if (alive) setMyrRate(rate);
      })
      .catch((cause) => {
        if (alive)
          setRateError(
            cause instanceof Error
              ? cause.message
              : "MYR conversion is unavailable.",
          );
      });
    return () => {
      alive = false;
    };
  }, [draft.currency]);
  const activeMyrRate = draft.currency === "MYR" ? 1 : myrRate;
  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-xl font-semibold">
          {event.createdAt === event.updatedAt ? "New event" : "Edit event"}
        </h2>
        {error && <p role="alert">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            Event name
            <Input
              aria-label="Event name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Japan Trip"
            />
          </label>
          <label>
            Currency
            <Select
              aria-label="Currency"
              value={draft.currency}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  currency: e.target.value as FinancialEvent["currency"],
                })
              }
            >
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </Select>
          </label>
          <label>
            Income or expense
            <Select
              aria-label="Income or expense event"
              value={draft.kind}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  kind: e.target.value as FinancialEvent["kind"],
                })
              }
            >
              <option value="expense">Expense (decreases assets)</option>
              <option value="income">Income (increases assets)</option>
            </Select>
          </label>
          <label>
            Start date
            <Input
              aria-label="Start date"
              type="date"
              value={draft.startDate}
              onChange={(e) =>
                setDraft({ ...draft, startDate: e.target.value })
              }
            />
          </label>
          <label>
            End date
            <Input
              aria-label="End date"
              type="date"
              value={draft.endDate}
              onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
            />
          </label>
          <label>
            Description
            <Textarea
              aria-label="Description"
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="Travel, bonus, laptop purchase or career break"
            />
          </label>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Event items</h3>
            <p className="text-sm text-slate-500">
              {days
                ? "Duration: " + days + " day" + (days === 1 ? "" : "s")
                : "Enter a valid date range."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              setDraft({
                ...draft,
                items: [...draft.items, newFinancialEventItem()],
              })
            }
          >
            <Plus size={16} />
            Add item
          </Button>
        </div>
        <div className="space-y-3">
          {draft.items.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-xl border border-slate-300/30 p-3 sm:grid-cols-[1fr_10rem_11rem_auto]"
            >
              <label>
                Item name
                <Input
                  aria-label="Item name"
                  value={item.name}
                  onChange={(e) => editItem(item.id, { name: e.target.value })}
                />
              </label>
              <label>
                Amount
                <Input
                  aria-label="Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) =>
                    editItem(item.id, { amount: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Cost type
                <Select
                  aria-label="Cost type"
                  value={item.frequency}
                  onChange={(e) =>
                    editItem(item.id, {
                      frequency: e.target
                        .value as FinancialEventItem["frequency"],
                    })
                  }
                >
                  <option value="once">One-time / fixed cost</option>
                  <option value="daily">Daily cost per day</option>
                </Select>
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={draft.items.length === 1}
                onClick={() =>
                  setDraft({
                    ...draft,
                    items: draft.items.filter((value) => value.id !== item.id),
                  })
                }
              >
                <Trash2 size={16} />
                <span className="sr-only">Delete item</span>
              </Button>
            </div>
          ))}
        </div>
        <dl className="grid gap-3 rounded-xl bg-slate-500/10 p-4 sm:grid-cols-2">
          <div>
            <dt>Total event {draft.kind}</dt>
            <dd className="text-2xl font-semibold">
              {formatEventCurrency(total, draft.currency)}
              {activeMyrRate !== null && draft.currency !== "MYR" && (
                <span className="ml-2 text-base font-normal text-slate-500">
                  ({formatCurrencyAmount(total * activeMyrRate, "MYR")})
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt>Financial projection impact</dt>
            <dd
              className={
                "text-2xl font-semibold " +
                (draft.kind === "income" ? "text-emerald-500" : "text-red-500")
              }
            >
              {impact >= 0 ? "+" : "-"}
              {formatEventCurrency(Math.abs(impact), draft.currency)}
              {activeMyrRate !== null && draft.currency !== "MYR" && (
                <span className="ml-2 text-base font-normal text-slate-500">
                  ({impact >= 0 ? "+" : "-"}
                  {formatCurrencyAmount(
                    Math.abs(impact) * activeMyrRate,
                    "MYR",
                  )}
                  )
                </span>
              )}
            </dd>
          </div>
        </dl>
        {rateError && (
          <p role="alert" className="text-sm text-amber-500">
            {rateError}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit">Save event</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function FinancialEventsPage() {
  const { events, storageError, saveEvents } = useFinancialEvents();
  const { currencies, addCurrency, removeCurrency } = useEventCurrencies();
  const [form, setForm] = useState<FinancialEvent | null>(null);
  const [error, setError] = useState("");
  const [currencyDraft, setCurrencyDraft] = useState("");
  const currencySearch = useFrankfurterCurrencies(currencyDraft);
  const [applyingId, setApplyingId] = useState("");
  const [expandedEventId, setExpandedEventId] = useState("");
  function persist(next: FinancialEvent[]) {
    try {
      saveEvents(next);
      setError("");
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save events.",
      );
      return false;
    }
  }
  async function eventCategoryId() {
    const { data: types, error: typeError } = await supabase
      .from("types")
      .select("id")
      .ilike("name", "Events")
      .limit(1);
    if (typeError) throw typeError;
    let typeId = types?.[0]?.id as number | undefined;
    if (!typeId) {
      const { data, error } = await supabase
        .from("types")
        .insert([{ name: "Events" }])
        .select("id")
        .single();
      if (error) throw error;
      typeId = data.id;
    }
    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("type_id", typeId)
      .ilike("name", "Event")
      .limit(1);
    if (categoryError) throw categoryError;
    if (categories?.[0]?.id) return categories[0].id as number;
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name: "Event", type_id: typeId }])
      .select("id")
      .single();
    if (error) throw error;
    return data.id as number;
  }
  async function applyEvent(event: FinancialEvent) {
    if (event.completedAt || applyingId) return;
    if (event.startDate > new Date().toISOString().slice(0, 10)) {
      setError("This event cannot be applied before its start date.");
      return;
    }
      setApplyingId(event.id);
      try {
        const nativeTotal = eventTotal(event);
        const myrRate =
          event.currency === "MYR"
            ? 1
            : await getDailyExchangeRate(event.currency, "MYR");
        const currency = event.currency === "SGD" ? "SGD" : "MYR";
        const amount =
          currency === event.currency
            ? nativeTotal
            : nativeTotal * myrRate;
      const note = "Event: " + event.name;
      const serviceError =
        event.kind === "expense"
          ? await createExpense({
              amount,
              note,
              expense_date: event.startDate,
              category_id: await eventCategoryId(),
              currency,
            })
          : await createIncome({
              amount,
              note,
              income_date: event.startDate,
              currency,
            });
      if (serviceError) throw serviceError;
      persist(
          events.map((value) =>
            value.id === event.id
              ? {
                  ...value,
                  completedAt: new Date().toISOString(),
                  appliedMyrRate: myrRate,
                  appliedMyrAmount: nativeTotal * myrRate,
                }
              : value,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not apply this event.",
      );
    } finally {
      setApplyingId("");
    }
  }
  useEffect(() => {
    events
      .filter(
        (event) =>
          event.autoApply &&
          !event.completedAt &&
          event.startDate <= new Date().toISOString().slice(0, 10),
      )
      .forEach((event) => {
        void applyEvent(event);
      });
    // applyEvent intentionally reads the latest rendered event list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events]);
  return (
    <main className="mx-auto min-h-screen max-w-5xl space-y-6 px-4 py-6 text-white sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Financial Events</h1>
          <p className="mt-1 text-zinc-400">
            Plan future income and expenses that change your financial
            projection.
          </p>
        </div>
        <Button
          disabled={!!storageError}
          onClick={() => setForm(newFinancialEvent(currencies[0] || "MYR"))}
        >
          <Plus size={18} />
          New event
        </Button>
      </header>
      {storageError && <p role="alert">{storageError}</p>}
      {error && <p role="alert">{error}</p>}
      {form && (
        <div className={overlayStyles.backdrop} role="dialog" aria-modal="true" aria-label="Event editor">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto">
            <EventForm
              event={form}
              currencies={currencies}
              onCancel={() => setForm(null)}
              onSave={(event) => {
                const exists = events.some((value) => value.id === event.id);
                if (persist(exists ? events.map((value) => value.id === event.id ? event : value) : [...events, event])) setForm(null);
              }}
            />
          </div>
        </div>
      )}
      <Card className="relative z-20 space-y-3 !overflow-visible">
        <div>
          <h2 className="text-xl font-semibold">Event currencies</h2>
          <p className="text-sm text-zinc-400">
            Add any supported three-letter ISO currency code. Existing events
            keep their native currency.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {currencies.map((currency) => (
            <span
              key={currency}
              className="flex items-center gap-2 rounded-xl border border-slate-300/30 px-3 py-2"
            >
              {currency}
              {!["MYR", "SGD"].includes(currency) && (
                <button
                  type="button"
                  aria-label={"Delete " + currency}
                  onClick={() => removeCurrency(currency)}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="relative">
          <Input
            aria-label="Search currencies"
            aria-autocomplete="list"
            aria-controls="currency-search-results"
            value={currencyDraft}
            placeholder="Search JPY or Japanese Yen"
            onChange={(event) => setCurrencyDraft(event.target.value)}
          />
          {currencyDraft.trim() && (
            <div
              id="currency-search-results"
              role="listbox"
              className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-slate-300/30 bg-zinc-950 p-1 shadow-xl"
            >
              {currencySearch.loading && <p className="px-3 py-2 text-sm text-zinc-400">Searching currencies…</p>}
              {currencySearch.error && <p role="alert" className="px-3 py-2 text-sm text-red-400">{currencySearch.error}</p>}
              {!currencySearch.loading && !currencySearch.error && currencySearch.matches.length === 0 && <p className="px-3 py-2 text-sm text-zinc-400">No supported currency found.</p>}
              {currencySearch.matches.map((currency) => (
                <button
                  key={currency.code}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10"
                  onClick={() => {
                    addCurrency(currency.code);
                    setCurrencyDraft("");
                  }}
                >
                  <span className="font-semibold">{currency.code}</span>
                  <span className="text-sm text-zinc-400">{currency.name}{currency.symbol ? " · " + currency.symbol : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
      {!events.length && !form && (
        <Card>
          <h2 className="text-xl font-semibold">Create your first event</h2>
          <p className="mt-2 text-zinc-400">
            Examples: Japan Trip, Annual Bonus, Buy Laptop, moving cost or a
            career break.
          </p>
        </Card>
      )}
      <div className="grid gap-4">
        {events
          .slice()
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
          .map((event) => {
            const expanded = expandedEventId === event.id;
            return (
            <Card key={event.id} className="space-y-3">
              <button
                type="button"
                className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
                aria-expanded={expanded}
                onClick={() => setExpandedEventId(expanded ? "" : event.id)}
              >
                <span><span className="block text-xl font-semibold">{event.name}</span><span className="mt-1 block text-sm text-zinc-400">{expanded ? "Hide details" : "Tap to view details"}</span></span>
                <NativeImpact event={event} />
              </button>
              {expanded && <>
              <div>
                <div>
                  <p className="text-sm text-zinc-400">
                    {event.startDate +
                      (event.endDate !== event.startDate
                        ? " to " + event.endDate
                        : "") +
                      " · " +
                      eventDays(event) +
                      " day" +
                      (eventDays(event) === 1 ? "" : "s")}
                  </p>
                </div>
              </div>
              {event.description && <p>{event.description}</p>}
              <ul className="space-y-1 text-sm">
                {event.items.map((item) => (
                  <li key={item.id}>
                    {item.name +
                      " · " +
                      formatEventCurrency(item.amount, event.currency) +
                      (item.frequency === "daily"
                        ? " / day × " + eventDays(event)
                        : " once")}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {event.completedAt ? (
                  <span className="rounded-xl bg-emerald-500/20 px-3 py-2 text-sm text-emerald-400">
                    Completed
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled={applyingId === event.id}
                    onClick={() => void applyEvent(event)}
                  >
                    {applyingId === event.id ? "Applying…" : "Apply"}
                  </Button>
                )}
                {!event.completedAt && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      persist(
                        events.map((value) =>
                          value.id === event.id
                            ? { ...value, autoApply: !value.autoApply }
                            : value,
                        ),
                      )
                    }
                  >
                    {event.autoApply ? "Auto apply on" : "Auto apply"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const copy = newFinancialEvent(event.currency);
                    copy.name = event.name + " (Copy)";
                    copy.description = event.description;
                    copy.kind = event.kind;
                    copy.startDate = event.startDate;
                    copy.endDate = event.endDate;
                    copy.items = event.items.map((item) => ({
                      ...item,
                      id: crypto.randomUUID(),
                    }));
                    persist([...events, copy]);
                  }}
                >
                  Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setForm(event)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (window.confirm("Delete " + event.name + "?"))
                      persist(events.filter((value) => value.id !== event.id));
                  }}
                >
                  Delete
                </Button>
              </div>
              </>}
            </Card>
            );
          })}
      </div>
    </main>
  );
}
