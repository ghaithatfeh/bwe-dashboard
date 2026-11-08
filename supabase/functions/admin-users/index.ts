// Super-admin-only admin management that needs the Auth admin API (and so
// the service-role key, which must never reach the browser):
//
//   { action: "create", email, password, first_name, last_name }
//   { action: "set_password", user_id, password }
//
// Deactivating / reactivating is a plain RPC (admin_set_admin_active).
// Deploy with: supabase functions deploy admin-users
import { createClient } from "npm:@supabase/supabase-js@2";

const MIN_PASSWORD_LENGTH = 8;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (error: string, status = 400) => json({ error }, status);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const authorization = req.headers.get("Authorization") ?? "";

  // Check the caller with their own token, so is_super_admin() sees them.
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: isSuperAdmin, error: roleError } = await caller.rpc("is_super_admin");
  if (roleError || isSuperAdmin !== true) return fail("Only the super admin can do this", 403);

  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body");
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (body.action === "create") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const firstName = typeof body.first_name === "string" ? body.first_name.trim().slice(0, 100) : "";
    const lastName = typeof body.last_name === "string" ? body.last_name.trim().slice(0, 100) : "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Invalid email address");

    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      // handle_new_user() copies these into the profile.
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (error || !data.user) return fail(error?.message ?? "Could not create the admin");

    const { error: grantError } = await service
      .from("user_roles")
      .insert({ user_id: data.user.id, role: "admin" });
    if (grantError) {
      // Don't leave a half-made account behind.
      await service.auth.admin.deleteUser(data.user.id);
      return fail(grantError.message, 500);
    }

    return json({ id: data.user.id });
  }

  if (body.action === "set_password") {
    const userId = typeof body.user_id === "string" ? body.user_id : "";

    const { data: role } = await service
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return fail("This account is not an admin");

    const { data: superAdmin } = await service
      .from("super_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (superAdmin) return fail("Use \"Change password\" to change your own password");

    const { error } = await service.auth.admin.updateUserById(userId, { password });
    if (error) return fail(error.message);

    // Sign them out everywhere so the old password's sessions end.
    const { error: revokeError } = await service.rpc("admin_revoke_sessions", { target_user_id: userId });
    if (revokeError) console.error("Could not revoke sessions", revokeError);
    return json({ ok: true });
  }

  return fail("Unknown action");
});
