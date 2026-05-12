import { Category }
from "./category";

export interface Expense {

  id:number;

  amount:number;

  note:string;

  expense_date:string;

  category_id:number;

  categories?:Category;
}