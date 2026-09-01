import type { Currency } from "@/types/currency";
import type {
  RecurringExpense,
  RecurringExpensePayload,
} from "@/types/recurringExpense";

interface RecurringFormValues {
  amount:string;
  category:string;
  currency:Currency;
  description:string;
  isActive:boolean;
  name:string;
  repeatDay:string;
}

export function getRecurringErrorMessage(
  action:string,
  error:unknown
) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";

  if (message.includes("schema cache")) {
    return `${action}: Supabase schema cache is stale. Run notify pgrst, 'reload schema'; in SQL Editor, then retry.`;
  }

  if (message) {
    return `${action}: ${message}`;
  }

  return `${action}. Run supabase/recurring_expenses.sql, then retry.`;
}

export function buildRecurringExpensePayload({
  amount,
  category,
  currency,
  description,
  isActive,
  name,
  repeatDay,
}:RecurringFormValues) {
  const numericAmount = Number(amount);
  const numericRepeatDay = Number(repeatDay);

  if (
    !name.trim() ||
    !amount ||
    !category ||
    Number.isNaN(numericAmount) ||
    numericAmount <= 0 ||
    !Number.isInteger(numericRepeatDay) ||
    numericRepeatDay < 1 ||
    numericRepeatDay > 31
  ) {
    return {
      error: "Please fill name, price, category, and day.",
      payload: null,
    };
  }

  const payload:RecurringExpensePayload = {
    name: name.trim(),
    amount: numericAmount,
    currency,
    description: description.trim() || null,
    category_id: Number(category),
    repeat_day: numericRepeatDay,
    is_active: isActive,
  };

  return {
    error: "",
    payload,
  };
}

export function recurringExpenseToFormValues(
  recurringExpense:RecurringExpense
) {
  return {
    amount: recurringExpense.amount.toString(),
    category: recurringExpense.category_id.toString(),
    description: recurringExpense.description || "",
    isActive: recurringExpense.is_active,
    name: recurringExpense.name,
    repeatDay: recurringExpense.repeat_day.toString(),
    currency: recurringExpense.currency,
  };
}
