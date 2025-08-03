import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getPublicUrl = (filename) => {
  // Replace 'your-bucket-name' with your actual bucket name
  const { data } = supabase.storage.from('locs').getPublicUrl(`not_approved/${filename}.jpg`);
  return data.publicUrl;
};