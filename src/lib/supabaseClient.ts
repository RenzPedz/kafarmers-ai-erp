import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_BOLT_DATABASE_URL ||
  'https://yzuixwgvqqdafdobkjen.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_BOLT_DATABASE_ANON_KEY ||
  'sb_publishable_WZG_4SnoBu_ZLU-89x-OIA_aK5JaxWp';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);