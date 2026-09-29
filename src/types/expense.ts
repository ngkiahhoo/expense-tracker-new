import { Category }
from "./category";
import type { Currency } from "./currency";

export interface Expense {

  id:number;

  amount:number;

  currency?:Currency;

  note:string;

  expense_date:string;

  category_id:number;

  asset_id?: number | null;

  recurring_expense_id?: number;
  payment_installment_id?: number | null;

  categories?:Category;
}
