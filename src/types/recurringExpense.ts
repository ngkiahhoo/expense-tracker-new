import { Category }
from "./category";
import type { Currency } from "./currency";

export interface RecurringExpense {

  id:number;

  name:string;

  amount:number;

  currency?:Currency;

  description:string | null;

  category_id:number;

  asset_id?: number | null;

  repeat_day:number;

  is_active:boolean;

  created_at?:string;

  updated_at?:string;

  categories?:Category;
}

export interface RecurringExpensePayload {

  name:string;

  amount:number;

  currency:Currency;

  description:string | null;

  category_id:number;

  asset_id?: number | null;

  repeat_day:number;

  is_active:boolean;
}
