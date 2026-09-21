-- Convert products.colors from text[] (hex codes) to a jsonb array of
-- { value, name_en, name_ar, name_fr } so each color can carry an
-- owner-entered, localized title. Existing values are preserved with
-- empty names.

ALTER TABLE public.products
  ADD COLUMN colors_new jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.products p
SET colors_new = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'value', c,
        'name_en', '',
        'name_ar', '',
        'name_fr', ''
      )
    )
    FROM unnest(p.colors) AS c
  ),
  '[]'::jsonb
);

ALTER TABLE public.products DROP COLUMN colors;
ALTER TABLE public.products RENAME COLUMN colors_new TO colors;
