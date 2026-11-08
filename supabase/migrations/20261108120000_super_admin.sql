-- Separate dashboard admins from website users, and add a super admin.
--
-- * Website users (WhatsApp / Google / Facebook) and dashboard admins
--   (email + password) are different kinds of account. A user can no longer
--   be promoted to admin or an admin demoted to a user: admin_set_user_admin()
--   is dropped, and admins are only created by the super admin through the
--   `admin-users` Edge Function.
-- * The super admin is a static flag in public.super_admins. Nothing in the
--   API can write to it; set it once from the SQL editor:
--
--     INSERT INTO public.super_admins (user_id)
--     SELECT id FROM auth.users WHERE email = 'owner@example.com';
--
--   Only the super admin can create admins, set their passwords, and
--   deactivate / reactivate them.

-- ---------------------------------------------------------------------------
-- Super admin flag
-- ---------------------------------------------------------------------------

CREATE TABLE public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No policies and no grants: only reachable through the functions below.
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.super_admins FROM anon, authenticated;

-- An admin counts only while not deactivated, so a deactivated admin loses
-- access as soon as this returns false, not when their token expires.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles r
    JOIN auth.users u ON u.id = r.user_id
    WHERE r.user_id = (SELECT auth.uid())
      AND r.role = 'admin'
      AND (u.banned_until IS NULL OR u.banned_until <= now())
  );
$$;

CREATE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_admin() AND EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = (SELECT auth.uid())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- No more promoting / demoting
-- ---------------------------------------------------------------------------

DROP FUNCTION public.admin_set_user_admin(uuid, boolean);

-- ---------------------------------------------------------------------------
-- Website users: admins are no longer listed, blocked or deleted here
-- ---------------------------------------------------------------------------

DROP FUNCTION public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  phone text,
  email text,
  address text,
  providers text[],
  banned boolean,
  last_sign_in_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    COALESCE(p.first_name, ''),
    COALESCE(p.last_name, ''),
    NULLIF(u.phone, '')::text,
    COALESCE(p.email, NULLIF(u.email, ''))::text,
    p.address,
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(u.raw_app_meta_data->'providers')),
      ARRAY[]::text[]
    ),
    COALESCE(u.banned_until > now(), false),
    u.last_sign_in_at,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin')
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_banned(target_user_id uuid, banned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Admins are managed from the Admins page';
  END IF;

  UPDATE auth.users
  SET banned_until = CASE WHEN banned THEN now() + interval '100 years' ELSE NULL END
  WHERE id = target_user_id;

  -- Revoke refresh tokens so a blocked user is signed out once their
  -- current access token expires.
  IF banned THEN
    DELETE FROM auth.sessions WHERE user_id = target_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Admins cannot be deleted; deactivate them instead';
  END IF;

  -- profiles and user_roles go with it via ON DELETE CASCADE.
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.admin_list_admins()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  is_super_admin boolean,
  active boolean,
  last_sign_in_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    COALESCE(p.first_name, ''),
    COALESCE(p.last_name, ''),
    NULLIF(u.email, '')::text,
    EXISTS (SELECT 1 FROM public.super_admins s WHERE s.user_id = u.id),
    NOT COALESCE(u.banned_until > now(), false),
    u.last_sign_in_at,
    u.created_at
  FROM auth.users u
  JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'admin'
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at;
END;
$$;

CREATE FUNCTION public.admin_set_admin_active(target_user_id uuid, active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the super admin can do this' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'This account is not an admin';
  END IF;
  IF EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = target_user_id) THEN
    RAISE EXCEPTION 'The super admin cannot be deactivated';
  END IF;

  UPDATE auth.users
  SET banned_until = CASE WHEN active THEN NULL ELSE now() + interval '100 years' END
  WHERE id = target_user_id;

  IF NOT active THEN
    DELETE FROM auth.sessions WHERE user_id = target_user_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_admins() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_admin_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_admin_active(uuid, boolean) TO authenticated;

-- Used by the admin-users Edge Function after it sets an admin's password,
-- so sessions opened with the old password end. Service role only.
CREATE FUNCTION public.admin_revoke_sessions(target_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_revoke_sessions(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_sessions(uuid) TO service_role;
