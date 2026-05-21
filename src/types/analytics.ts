import type { Expense } from "./expense";

export interface CategoryBreakdownItem {
  categoryId: number | null;
  categoryName: string;
  totalAmount: number;
  percentage: number;
  expenses: Expense[];
  color: string;
}
