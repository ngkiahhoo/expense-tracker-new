import type { Currency } from "./currency";

export type SourceType = "HISTORICAL" | "RECURRING" | "EXISTING_COMMITMENT" | "USER_CREATED" | "USER_OVERRIDE" | "ESTIMATED";
export type ExpenseClass = "ESSENTIAL" | "FLEXIBLE" | "DISCRETIONARY" | "COMMITMENT";
export interface Assumption {
  amount: number;
  currency: Currency;
  source_type: SourceType;
}
export interface ScenarioExpense extends Assumption {
  id: string;
  name: string;
  classification: ExpenseClass;
  enabled: boolean;
  repeat_day?: number;
  source_reference_id?: string;
  source_category_id?: string;
  source_category_name?: string;
}
export interface ScenarioIncome extends Assumption {
  id: string;
  kind: "salary" | "freelance" | "part-time" | "benefits" | "bonus" | "other";
  first_payment_date?: string;
  payment_day?: number;
}
export interface LifeScenarioPhase {
  id: string;
  scenario_id: string;
  name: string;
  start_date: string;
  end_date: string;
  incomes: ScenarioIncome[] | null;
  expense_plan_id: string;
  expense_overrides: Record<string, Assumption & { enabled: boolean }>;
  location_label: string;
  note: string;
  created_at: string;
  updated_at: string;
}
export interface ScenarioEvent extends Assumption {
  generated_by?: "JOB_TRANSITION";
  id: string;
  scenario_id: string;
  phase_id?: string;
  date: string;
  type: "ONE_TIME_INCOME" | "ONE_TIME_EXPENSE" | "RELOCATION_COST" | "TRAVEL_COST" | "DEPOSIT" | "BONUS" | "REFUND" | "OTHER";
  direction: "income" | "expense";
  description: string;
}
export interface ScenarioBaseline {
  as_of: string;
  income: Assumption;
  liquid_assets: Assumption;
  asset_candidates: { id: number; name: string; amount: number; included: boolean }[];
  savings_pace: Assumption;
  expenses: ScenarioExpense[];
  repayments: (Assumption & { id: string; name: string; date: string })[];
  completed_months: string[];
  actual_current_income: number;
  actual_current_expenses: number;
  historical_assets: { month: string; amount: number }[];
  reviewed: boolean;
}
export interface LifeScenario {
  version: 2;
  expense_plan_id: string;
  id: string;
  name: string;
  description: string;
  start_date: string;
  projection_end_date: string;
  currency: Currency;
  minimum_reserve: number;
  inflation_enabled: boolean;
  inflation_rate: number;
  yield_enabled: boolean;
  yield_rate: number;
  yield_eligible_balance: number;
  lifestyle: "NORMAL" | "LEAN" | "COMFORTABLE";
  flexible_multiplier: number;
  fx: Record<Currency, number>;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  baseline: ScenarioBaseline;
  phases: LifeScenarioPhase[];
  events: ScenarioEvent[];
  linked_goal_id?: string;
  created_at: string;
  updated_at: string;
}
export interface ProjectionMonth {
  living_cost: number;
  fixed_commitments: number;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  month: string;
  status: "PROJECTED";
  opening_balance: number;
  income: number;
  essential_expenses: number;
  flexible_expenses: number;
  discretionary_expenses: number;
  liability_payments: number;
  recurring_commitments: number;
  one_time_events: number;
  one_time_income: number;
  investment_or_cash_yield: number;
  inflation_effect: number;
  total_outflow: number;
  net_cashflow: number;
  closing_balance: number;
}
