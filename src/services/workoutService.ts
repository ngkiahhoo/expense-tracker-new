import { supabase } from "@/lib/supabase";

export async function getWorkoutState<T>() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to sync workout data with Supabase.");

  const { data, error } = await supabase
    .from("workout_app_state")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data?.payload || null) as T | null;
}

export async function saveWorkoutState(payload: unknown) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to sync workout data with Supabase.");

  const { error } = await supabase
    .from("workout_app_state")
    .upsert({ user_id: userId, payload, updated_at: new Date().toISOString() });

  if (error) throw error;
}
