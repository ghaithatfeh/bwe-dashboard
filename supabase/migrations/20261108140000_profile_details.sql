-- More optional profile details, filled in by the user after sign-up.
--
-- `address` stays as the street / address line; country and city sit next
-- to it. country is an ISO 3166-1 alpha-2 code (e.g. 'MA'); the apps show
-- it as a localized name.

ALTER TABLE public.profiles
  ADD COLUMN nickname text CHECK (nickname IS NULL OR char_length(nickname) <= 100),
  ADD COLUMN country text CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  ADD COLUMN city text CHECK (city IS NULL OR char_length(city) <= 100),
  ADD COLUMN shipping_company_name text
    CHECK (shipping_company_name IS NULL OR char_length(shipping_company_name) <= 100),
  ADD COLUMN shipping_company_phone text
    CHECK (shipping_company_phone IS NULL OR (
      char_length(shipping_company_phone) <= 30 AND shipping_company_phone ~ '^[0-9+()\s-]+$'
    ));

-- Same rule as the existing editable columns: users edit their own row,
-- admins edit any (enforced by the existing UPDATE policy).
GRANT UPDATE (nickname, country, city, shipping_company_name, shipping_company_phone)
  ON public.profiles TO authenticated;
