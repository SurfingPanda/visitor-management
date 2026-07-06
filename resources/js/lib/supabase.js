import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Null when Supabase isn't configured yet — callers guard on this so the app
// still runs (the Google button just reports it's unavailable).
export const supabase =
    url && anonKey ? createClient(url, anonKey) : null;
