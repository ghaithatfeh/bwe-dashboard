import { supabase } from "@/integrations/supabase/client";

/**
 * Website visitors share the same Supabase auth, so a session alone does not
 * mean dashboard access. RLS enforces this server-side; this check only keeps
 * non-admins out of the UI.
 */
export const isAdmin = async () => {
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
};
