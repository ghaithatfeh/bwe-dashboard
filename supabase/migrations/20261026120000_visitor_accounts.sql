-- Visitor accounts (WhatsApp OTP / Google / Facebook) + admin role.
--
-- Until now every signed-in user was the shop owner, so RLS granted all
-- writes to the `authenticated` role. Once visitors can sign up that is no
-- longer true, so writes are restricted to users holding the `admin` role.
-- Every user that exists when this migration runs is promoted to admin:
-- they already have full write access today, so nothing is widened.

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER so policies can call it without recursing into
-- user_roles' own RLS.
CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Read-only from the API; roles change through admin_set_user_admin().
CREATE POLICY "Users can view own roles, admins view all"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '' CHECK (char_length(first_name) <= 100),
  last_name text NOT NULL DEFAULT '' CHECK (char_length(last_name) <= 100),
  -- Verified phone, mirrored from auth.users.phone. Not writable from the API.
  phone text,
  -- Contact email. Optional; pre-filled from the OAuth provider when available.
  email text CHECK (email IS NULL OR (char_length(email) <= 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  address text CHECK (address IS NULL OR char_length(address) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_phone ON public.profiles (phone);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can view own profile, admins view all"
ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can update own profile, admins update all"
ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()) OR public.is_admin())
WITH CHECK (id = (SELECT auth.uid()) OR public.is_admin());

-- Rows are created by the auth trigger and removed by the FK cascade.
-- Only the editable columns are writable; phone/id/timestamps are not.
REVOKE ALL ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
GRANT UPDATE (first_name, last_name, email, address) ON public.profiles TO authenticated;

-- Creates the profile when a user signs up. Phone sign-up passes
-- first_name/last_name in options.data; Google sends given_name/family_name;
-- Facebook only sends a full name.
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  full_name text := btrim(COALESCE(meta->>'full_name', meta->>'name', ''));
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, email)
  VALUES (
    NEW.id,
    left(btrim(COALESCE(meta->>'first_name', meta->>'given_name', split_part(full_name, ' ', 1))), 100),
    left(btrim(COALESCE(meta->>'last_name', meta->>'family_name', substr(full_name, char_length(split_part(full_name, ' ', 1)) + 2))), 100),
    NULLIF(NEW.phone, ''),
    NULLIF(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keeps the verified phone in sync, and fills a missing contact email.
CREATE FUNCTION public.handle_user_contact_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET phone = NULLIF(NEW.phone, ''),
      email = COALESCE(email, NULLIF(NEW.email, ''))
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_contact_changed
AFTER UPDATE OF phone, email ON auth.users
FOR EACH ROW
WHEN (OLD.phone IS DISTINCT FROM NEW.phone OR OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.handle_user_contact_change();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_contact_change() FROM PUBLIC, anon, authenticated;

-- Profiles for users that already exist (the admins).
INSERT INTO public.profiles (id, phone, email)
SELECT id, NULLIF(phone, ''), NULLIF(email, '') FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Admin-only user management (needs auth.users, so SECURITY DEFINER)
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  phone text,
  email text,
  address text,
  providers text[],
  is_admin boolean,
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
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin'),
    COALESCE(u.banned_until > now(), false),
    u.last_sign_in_at,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

CREATE FUNCTION public.admin_set_user_banned(target_user_id uuid, banned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF target_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'You cannot block your own account';
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

CREATE FUNCTION public.admin_set_user_admin(target_user_id uuid, make_admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF target_user_id = (SELECT auth.uid()) AND NOT make_admin THEN
    RAISE EXCEPTION 'You cannot remove your own admin role';
  END IF;

  IF make_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = target_user_id AND role = 'admin';
  END IF;
END;
$$;

CREATE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF target_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  -- profiles and user_roles go with it via ON DELETE CASCADE.
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_banned(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_admin(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_banned(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_admin(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Restrict catalog writes to admins (reads stay public)
-- ---------------------------------------------------------------------------

DROP POLICY "Authenticated users can insert categories" ON public.categories;
DROP POLICY "Authenticated users can update categories" ON public.categories;
DROP POLICY "Authenticated users can delete categories" ON public.categories;
DROP POLICY "Authenticated users can insert products" ON public.products;
DROP POLICY "Authenticated users can update products" ON public.products;
DROP POLICY "Authenticated users can delete products" ON public.products;

CREATE POLICY "Admins can insert categories" ON public.categories
FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update categories" ON public.categories
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete categories" ON public.categories
FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can insert products" ON public.products
FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update products" ON public.products
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete products" ON public.products
FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY "Authenticated users can upload product images" ON storage.objects;
DROP POLICY "Authenticated users can update product images" ON storage.objects;
DROP POLICY "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Admins can upload product images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
CREATE POLICY "Admins can update product images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin());
CREATE POLICY "Admins can delete product images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'product-images' AND public.is_admin());
