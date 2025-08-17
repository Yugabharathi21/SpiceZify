import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or ANON key not set. Preferences persistence will be disabled.');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');

// Legacy functions - replaced by database.ts service layer
export async function fetchUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from('preferences')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error) {
    // If the table doesn't exist, supabase returns a 404 via the REST endpoint.
    // Surface a clearer message for debugging.
    function hasStatusCode(err: unknown): err is { status: number } {
      if (!err || typeof err !== 'object') return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = (err as any).status;
      return typeof s === 'number';
    }

    if (hasStatusCode(error) && error.status === 404) {
      console.warn('Supabase preferences table not found (404). Create a `preferences` table in Supabase to enable persistence.');
    }
    return { data: null, error };
  }

  return { data: data?.data ?? null, error: null };
}

export async function upsertUserPreferences(userId: string, prefs: Record<string, unknown>) {
  const payload = { user_id: userId, data: prefs };
  const { data, error } = await supabase
    .from('preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select();

  if (error) {
    // Print full error shape for debugging (message, details, hint, code)
    const supaErr = error as unknown as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
      status?: number;
    };

    try {
      console.error('[supabase] upsertUserPreferences error', {
        payload,
        message: supaErr.message,
        details: supaErr.details,
        hint: supaErr.hint,
        code: supaErr.code,
        status: supaErr.status,
      });
    } catch {
      console.error('[supabase] upsertUserPreferences error (could not stringify)', error);
    }
  } else {
    console.debug('[supabase] upsertUserPreferences success', { payload, data });
  }

  return { data, error };
}

export default supabase;
