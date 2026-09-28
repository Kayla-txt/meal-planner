import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env. Restart Vite after adding them.",
  );
}

// This client runs in the browser. It intentionally uses the publishable key,
// never SUPABASE_SECRET_KEY.
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
