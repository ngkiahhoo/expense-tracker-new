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

  recurring_expense_id?: number;

  categories?:Category;
}
