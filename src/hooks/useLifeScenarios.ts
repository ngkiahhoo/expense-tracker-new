"use client";
import { useMemo, useSyncExternalStore } from "react";
import type { LifeScenario } from "../types/lifeScenario";
import type { FutureExpenseLibrary } from "../types/futureExpense";
import { validateScenario } from "../utils/lifeScenario";
import { assertWorkspaceShape, emptyPlanningWorkspace, migrateLegacyScenarios, type PlanningWorkspace } from "../utils/planningWorkspace";

const key = "expense-tracker-future-planning-v2";
const legacyKey = "expense-tracker-life-scenarios-v1";
const event = "life-scenarios-change";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener(event, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(event, callback); };
}
function snapshot() {
  try { const current = localStorage.getItem(key); return current === null ? `legacy:${localStorage.getItem(legacyKey) || "[]"}` : current; }
  catch { return "!unavailable"; }
}
function parse(raw: string): PlanningWorkspace {
  if (raw.startsWith("legacy:")) return migrateLegacyScenarios(raw.slice(7));
  const value: unknown = JSON.parse(raw); assertWorkspaceShape(value); return value;
}
export default function useLifeScenarios() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "legacy:[]");
  const parsed = useMemo(() => {
    try { return { workspace: parse(raw), storageError: "" }; }
    catch { return { workspace: emptyPlanningWorkspace(), storageError: "Saved planning data could not be read. Storage may be unavailable or damaged. Existing data has been preserved." }; }
  }, [raw]);
  function persist(update: (current: PlanningWorkspace) => PlanningWorkspace) {
    if (parsed.storageError) throw new Error(parsed.storageError);
    const next = update(parse(snapshot())); assertWorkspaceShape(next);
    localStorage.setItem(key, JSON.stringify(next)); window.dispatchEvent(new Event(event));
  }
  function saveScenario(s: LifeScenario) {
    persist(current => {
      if (s.status === "ACTIVE" && (!s.baseline.reviewed || validateScenario(s, current.library).length)) throw new Error("Review plans and resolve validation errors before saving an active scenario. Drafts can be saved for later.");
      const updated = { ...s, updated_at: new Date().toISOString() };
      return { ...current, scenarios: current.scenarios.some(x => x.id === s.id) ? current.scenarios.map(x => x.id === s.id ? updated : x) : [...current.scenarios, updated] };
    });
  }
  function saveLibrary(library: FutureExpenseLibrary) {
    persist(current => {
      if (JSON.stringify(current.library) !== JSON.stringify(parsed.workspace.library)) throw new Error("Expense plans changed in another tab. Reload this editor before saving.");
      const referenced = new Set(current.scenarios.flatMap(s => [s.expense_plan_id, ...s.phases.map(p => p.expense_plan_id)]).filter(Boolean));
      if ([...referenced].some(id => !library.plans.some(p => p.id === id))) throw new Error("This plan is used by a saved scenario. Select another plan there and save the scenario before deleting it.");
      const now = new Date().toISOString();
      const touch = <T extends { id: string; updated_at: string }>(next: T[], previous: T[]): T[] => next.map(item => {
        const old = previous.find(p => p.id === item.id);
        return old && JSON.stringify(old) !== JSON.stringify(item) ? { ...item, updated_at: now } : item;
      });
      library = { ...library, types: touch(library.types, current.library.types), categories: touch(library.categories, current.library.categories), plans: touch(library.plans, current.library.plans) };
      const scenarios = current.scenarios.map(s => ({ ...s, phases: s.phases.map(p => ({ ...p, expense_overrides: Object.fromEntries(Object.entries(p.expense_overrides).filter(([id]) => library.plans.find(plan => plan.id === p.expense_plan_id)?.items.some(i => i.id === id))) })) }));
      return { ...current, library, scenarios };
    });
  }
  return { scenarios: parsed.workspace.scenarios, library: parsed.workspace.library, storageError: parsed.storageError, migrated: raw.startsWith("legacy:") && parsed.workspace.scenarios.length > 0, saveScenario, saveLibrary };
}
