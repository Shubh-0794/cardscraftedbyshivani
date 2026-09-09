import { createClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_ID = 'qdcqyxykmdfxxxgyhgbl';
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable__D3m60m82RXB_ScfHSNmtg_wuJ7FxKW';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
