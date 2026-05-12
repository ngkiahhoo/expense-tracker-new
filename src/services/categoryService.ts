import { supabase } from "../lib/supabase";

export async function getCategories() {

  const { data, error } =
    await supabase
      .from("categories")
      .select(`
        id,
        name,
        type_id,
        types (
          id,
          name
        )
      `)
      .order("name");

  if (error) {

    console.log(error);

    return [];
  }

  return data || [];
}

export async function createCategory(
  payload:any
) {

  const { error } =
    await supabase
      .from("categories")
      .insert([payload]);

  return error;
}

export async function updateCategory(
  id:number,
  payload:any
) {

  const { error } =
    await supabase
      .from("categories")
      .update(payload)
      .eq("id", id);

  return error;
}

export async function removeCategory(
  id:number
) {

  const { error } =
    await supabase
      .from("categories")
      .delete()
      .eq("id", id);

  return error;
}

export async function getTypeId(
  selectedType:string
) {

  const { data } =
    await supabase
      .from("types")
      .select("id")
      .ilike(
        "name",
        selectedType
      )
      .single();

  return data?.id;
}