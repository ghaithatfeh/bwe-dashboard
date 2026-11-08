import { createClient, FunctionsHttpError } from "@supabase/supabase-js";
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

/** Only the super admin can create admins, set their passwords and deactivate them. */
export const isSuperAdmin = async () => {
  const { data, error } = await supabase.rpc("is_super_admin");
  return !error && data === true;
};

/** Kept in sync with the admin-users Edge Function. */
export const MIN_PASSWORD_LENGTH = 8;

type AdminUsersRequest =
  | { action: "create"; email: string; password: string; first_name: string; last_name: string }
  | { action: "set_password"; user_id: string; password: string };

/** Calls the admin-users Edge Function; resolves to an error message or null. */
export const callAdminUsers = async (body: AdminUsersRequest): Promise<string | null> => {
  const { error } = await supabase.functions.invoke("admin-users", { body });
  if (!error) return null;

  // The function answers { error } with a 4xx; surface that message.
  if (error instanceof FunctionsHttpError) {
    const payload = await error.context.json().catch(() => null);
    if (payload?.error) return payload.error;
  }
  return error.message;
};

/**
 * Checks the signed-in admin's current password without touching their
 * session: signs in on a throwaway, non-persisting client.
 */
export const verifyPassword = async (email: string, password: string) => {
  const probe = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: "bwe-dashboard-password-check" },
  });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
};
