import type { Currency } from "./currency";
interface Assumption { amount: number; currency: Currency; source_type: "HISTORICAL" | "RECURRING" | "EXISTING_COMMITMENT" | "USER_CREATED" | "USER_OVERRIDE" | "ESTIMATED"; }

export type ExpenseBehavior = "MANDATORY" | "REDUCIBLE" | "OPTIONAL" | "COMMITMENT";
export interface FutureExpenseType {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  behavior_tag: ExpenseBehavior;
  created_at: string;
  updated_at: string;
}
export interface FutureExpenseCategory {
  id: string;
  type_id: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface FutureExpenseItem extends Assumption {
  id: string;
  plan_id: string;
  type_id: string | null;
  category_id: string | null;
  name: string;
  source_reference_id?: string;
  source_category_id?: string;
  historical_average?: number;
  historical_currency?: Currency;
  enabled: boolean;
  start_date?: string;
  end_date?: string;
  repeat_day?: number;
  is_fixed: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}
export interface FutureExpensePlan {
  id: string;
  name: string;
  description: string;
  currency: Currency;
  monthly_income?: number;
  months_to_project?: number;
  items: FutureExpenseItem[];
  confirmed: boolean;
  created_at: string;
  updated_at: string;
}
export interface HistoricalCategoryMapping {
  source_category_id: string;
  future_type_id: string;
  future_category_id: string;
}
export interface FutureExpenseLibrary {
  plans: FutureExpensePlan[];
  types: FutureExpenseType[];
  categories: FutureExpenseCategory[];
  mappings: HistoricalCategoryMapping[];
}
