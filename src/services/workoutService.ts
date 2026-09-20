import { supabase } from "@/lib/supabase";

export const workoutStorageKey = "expense-tracker-gym-mvp";
export const activeWorkoutStorageKey = "expense-tracker-gym-active";
export const pausedWorkoutStorageKey = "expense-tracker-gym-paused";

const sharedStateKey = "personal-gym";

export async function getWorkoutState<T>() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (userId) {
    const { data, error } = await supabase
      .from("workout_app_state")
      .select("payload")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data?.payload || null) as T | null;
  }

  const { data, error } = await supabase
    .from("workout_shared_state")
    .select("payload")
    .eq("state_key", sharedStateKey)
    .maybeSingle();

  if (error) throw error;
  return (data?.payload || null) as T | null;
}

export async function saveWorkoutState(payload: unknown) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (userId) {
    const { error } = await supabase
      .from("workout_app_state")
      .upsert({ user_id: userId, payload, updated_at: new Date().toISOString() });

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("workout_shared_state")
    .upsert({ state_key: sharedStateKey, payload, updated_at: new Date().toISOString() });

  if (error) throw error;
}
