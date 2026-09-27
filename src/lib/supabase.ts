import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
export const isSupabaseConfigured = Boolean(url && /^https?:\/\/[^\s/]+/i.test(url) && key);

let client: SupabaseClient | undefined;

// Defer initialization so missing local configuration cannot crash module imports.
// Never point an unconfigured installation at a placeholder database.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart the app.');
    }
    client ??= createClient(url!, key!);
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
