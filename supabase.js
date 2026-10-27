import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
    "https://yowhxryuxsqvjddizrts.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_PmWdgB9fyBl7L9IkyOzxRA_lcYBJdvP";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
