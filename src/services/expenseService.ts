import { supabase } from "../lib/supabase";

export async function getExpenses(
  selectedMonth:string
) {

  const [year, month] = selectedMonth.split("-").map(Number);
  const start = `${selectedMonth}-01`;
  const end = `${selectedMonth}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;

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

export async function getExpensesByCategory(
  selectedMonth: string,
  categoryId: number | null,
  search: string | null = null,
  limit = 10,
  offset = 0,
  sortField = 'expense_date',
  sortDirection: 'asc' | 'desc' = 'desc'
) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const start = `${selectedMonth}-01`;
  const end = `${selectedMonth}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;

  let query = supabase
    .from('expenses')
    .select(
      `*, categories ( id, name, type_id, types ( id, name ) )`,
      { count: 'exact' }
    )
    .gte('expense_date', start)
    .lte('expense_date', end)
    .range(offset, offset + limit - 1)
    .order(sortField, { ascending: sortDirection === 'asc' });

  if (categoryId !== null) {
    query = query.eq('category_id', categoryId);
  }

  if (search) {
    // simple server-side search on note field
    query = query.ilike('note', `%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.log(error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}