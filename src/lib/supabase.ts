import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osipywezebiylngedhwl.supabase.co';
const supabaseAnonKey = 'sb_publishable_WM9jiGyGRXBAW524uvYsIA_EhZFBRQl';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
