-- Optional product price (in MAD), set from the dashboard. NULL means no
-- price is shown on the website.

ALTER TABLE public.products
  ADD COLUMN price numeric(12, 2) CHECK (price >= 0);
