import { supabase } from "../lib/supabase";

export async function getIncomes(
  selectedMonth:string
) {

  const start =
    `${selectedMonth}-01`;

  const end =
    `${selectedMonth}-31`;

  const { data, error } =
    await supabase
      .from("incomes")
      .select("*")
      .gte(
        "income_date",
        start
      )
      .lte(
        "income_date",
        end
      );

  if (error) {

    console.log(error);

    return [];
  }

  return data || [];
}

export async function createIncome(
  payload:any
) {

  const { error } =
    await supabase
      .from("incomes")
      .insert([payload]);

  return error;
}

export async function updateIncome(
  id:number,
  payload:any
) {

  const { error } =
    await supabase
      .from("incomes")
      .update(payload)
      .eq("id", id);

  return error;
}

export async function removeIncome(
  id:number
) {

  const { error } =
    await supabase
      .from("incomes")
      .delete()
      .eq("id", id);

  return error;
}