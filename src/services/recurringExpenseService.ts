import { supabase }
from "../lib/supabase";

import type {
  RecurringExpense,
  RecurringExpensePayload,
} from "../types/recurringExpense";

function dateInputValue(
  date:Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthNumber(
  selectedMonth:string
) {
  return Number(
    selectedMonth.slice(5, 7)
  );
}

export function getRecurringExpenseDate(
  selectedMonth:string,
  repeatDay:number
) {
  const year =
    Number(
      selectedMonth.slice(0, 4)
    );

  const month =
    monthNumber(
      selectedMonth
    );

  const lastDay =
    new Date(
      year,
      month,
      0
    ).getDate();

  const safeDay =
    Math.min(
      Math.max(
        repeatDay,
        1
      ),
      lastDay
    );

  return `${selectedMonth}-${String(
    safeDay
  ).padStart(2, "0")}`;
}

export function formatRecurringExpenseNote(
  name:string,
  description:string | null
) {
  const cleanDescription =
    description?.trim();

  if (!cleanDescription) {
    return name.trim();
  }

  return `${name.trim()} - ${cleanDescription}`;
}

export function isRecurringExpenseDue(
  recurringExpense:RecurringExpense,
  selectedMonth:string
) {
  if (!recurringExpense.is_active) {
    return false;
  }

  const expenseDate =
    getRecurringExpenseDate(
      selectedMonth,
      recurringExpense.repeat_day
    );

  const today =
    dateInputValue(
      new Date()
    );

  const createdDate =
    recurringExpense.created_at?.slice(
      0,
      10
    );

  if (
    createdDate &&
    expenseDate < createdDate
  ) {
    return false;
  }

  return expenseDate <= today;
}

export async function getRecurringExpenses() {
  const { data, error } =
    await supabase
      .from("recurring_expenses")
      .select(`
        *,
        categories (
          id,
          name,
          type_id,
          types (
            id,
            name
          )
        )
      `)
      .order("repeat_day", {
        ascending:true,
      })
      .order("name", {
        ascending:true,
      });

  return {
    data:
      (data || []) as RecurringExpense[],
    error,
  };
}

export async function updateGeneratedExpenseForRecurring(
  selectedMonth:string,
  recurringExpense:RecurringExpense,
  payload:{
    amount:number;
    note:string;
    expense_date:string;
    category_id:number;
  }
) {
  const expenseDate =
    getRecurringExpenseDate(
      selectedMonth,
      recurringExpense.repeat_day
    );

  const [year, month] = selectedMonth
    .split("-")
    .map(Number);
  const start = `${selectedMonth}-01`;
  const end = `${selectedMonth}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;

  let query = supabase
    .from("expenses")
    .select("id")
    .eq("recurring_expense_id", recurringExpense.id)
    .gte("expense_date", start)
    .lte("expense_date", end)
    .limit(1);

  let result = await query;

  if (result.error) {
    const originalNote =
      formatRecurringExpenseNote(
        recurringExpense.name,
        recurringExpense.description || ""
      );

    result = await supabase
      .from("expenses")
      .select("id")
      .eq("expense_date", expenseDate)
      .eq("category_id", recurringExpense.category_id)
      .eq("amount", Number(recurringExpense.amount))
      .eq("note", originalNote)
      .limit(1);
  }

  if (result.error) {
    return result.error;
  }

  if (!result.data || result.data.length === 0) {
    return null;
  }

  const { error:updateError } =
    await supabase
      .from("expenses")
      .update(payload)
      .eq("id", result.data[0].id);

  return updateError;
}

export async function createRecurringExpense(
  payload:RecurringExpensePayload
) {
  const { error } =
    await supabase
      .from("recurring_expenses")
      .insert([payload]);

  return error;
}

export async function updateRecurringExpense(
  id:number,
  payload:RecurringExpensePayload
) {
  const { error } =
    await supabase
      .from("recurring_expenses")
      .update(payload)
      .eq("id", id);

  return error;
}

export async function removeRecurringExpense(
  id:number
) {
  const { error } =
    await supabase
      .from("recurring_expenses")
      .delete()
      .eq("id", id);

  return error;
}

async function generatedExpenseExists(
  payload:{
    amount:number;
    note:string;
    expense_date:string;
    category_id:number;
    recurring_expense_id:number;
  }
) {
  let result = await supabase
    .from("expenses")
    .select("id")
    .eq("recurring_expense_id", payload.recurring_expense_id)
    .eq(
      "expense_date",
      payload.expense_date
    )
    .limit(1);

  if (result.error) {
    result = await supabase
      .from("expenses")
      .select("id")
      .eq(
        "amount",
        payload.amount
      )
      .eq(
        "note",
        payload.note
      )
      .eq(
        "expense_date",
        payload.expense_date
      )
      .eq(
        "category_id",
        payload.category_id
      )
      .limit(1);
  }

  if (result.error) {
    return {
      exists:false,
      id:null,
      error: result.error,
    };
  }

  return {
    exists:
      Boolean(
        result.data?.length
      ),
    id: result.data?.[0]?.id ?? null,
    error:null,
  };
}

export async function generateRecurringExpensesForMonth(
  selectedMonth:string
) {
  const {
    data:recurringExpenses,
    error,
  } = await getRecurringExpenses();

  if (error) {
    return {
      createdCount:0,
      error,
    };
  }

  let createdCount = 0;

  for (
    const recurringExpense
    of recurringExpenses
  ) {
    if (
      !isRecurringExpenseDue(
        recurringExpense,
        selectedMonth
      )
    ) {
      continue;
    }

    const payload = {
      amount:
        Number(
          recurringExpense.amount
        ),
      note:
        formatRecurringExpenseNote(
          recurringExpense.name,
          recurringExpense.description
        ),
      expense_date:
        getRecurringExpenseDate(
          selectedMonth,
          recurringExpense.repeat_day
        ),
      category_id:
        Number(
          recurringExpense.category_id
        ),
      recurring_expense_id:
        recurringExpense.id,
    };

    const existing =
      await generatedExpenseExists(
        payload
      );

    if (existing.error) {
      return {
        createdCount,
        error:
          existing.error,
      };
    }

    if (existing.exists) {
      if (existing.id !== null) {
        const { error:updateError } =
          await supabase
            .from("expenses")
            .update({
              amount: payload.amount,
              note: payload.note,
              expense_date: payload.expense_date,
              category_id: payload.category_id,
            })
            .eq("id", existing.id);

        if (updateError) {
          return {
            createdCount,
            error: updateError,
          };
        }
      }

      continue;
    }

    const { error:insertError } =
      await supabase
        .from("expenses")
        .insert([payload]);

    if (insertError) {
      return {
        createdCount,
        error:
          insertError,
      };
    }

    createdCount += 1;
  }

  return {
    createdCount,
    error:null,
  };
}
