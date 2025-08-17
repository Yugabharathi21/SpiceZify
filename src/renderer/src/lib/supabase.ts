import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from('preferences')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error) return { data: null, error };
  return { data: data?.data ?? null, error: null };
}

export async function upsertUserPreferences(userId: string, prefs: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('preferences')
    .upsert({ user_id: userId, data: prefs }, { onConflict: 'user_id' })
    .select();

  return { data, error };
}

export default supabase;
