import { supabase } from "../lib/supabase";

export async function getExpenses(
  selectedMonth:string
) {

  const start =
    `${selectedMonth}-01`;

  const end =
    `${selectedMonth}-31`;

  const { data, error } =
    await supabase
      .from("expenses")
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
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", {
        ascending:false,
      });

  if (error) {
    console.log(error);
    return [];
  }

  return data || [];
}

export async function createExpense(
  payload:any
) {

  const { error } =
    await supabase
      .from("expenses")
      .insert([payload]);

  return error;
}

export async function updateExpense(
  id:number,
  payload:any
) {

  const { error } =
    await supabase
      .from("expenses")
      .update(payload)
      .eq("id", id);

  return error;
}

export async function removeExpense(
  id:number
) {

  const { error } =
    await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

  return error;
}