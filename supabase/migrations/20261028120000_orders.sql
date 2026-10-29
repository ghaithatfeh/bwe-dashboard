-- Online orders placed from the website cart.
--
-- The website is a static export with no server, so every rule lives here:
-- customers can only create orders through place_order(), which copies the
-- price and product details from the catalog (the client never sends a
-- price), and only admins can move an order through its statuses.
--
-- Quantities are in boxes and products.price is the price of one box.
-- A product without a price can still be ordered; the admin sets the item
-- price before confirming the order.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TYPE public.order_status AS ENUM (
  'new', 'confirmed', 'processing', 'delivering', 'completed', 'cancelled'
);

CREATE TABLE public.orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- SET NULL so the order history survives admin_delete_user().
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'new',
  -- Contact details as entered at checkout.
  customer_name text NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 200),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 1 AND 30),
  address text NOT NULL CHECK (char_length(address) BETWEEN 1 AND 500),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  -- NULL while any item is still waiting for a price.
  total numeric(12, 2) CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON public.orders (user_id);
CREATE INDEX idx_orders_status_created_at ON public.orders (status, created_at DESC);

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id bigint REFERENCES public.products(id) ON DELETE SET NULL,
  -- Snapshot of the product when the order was placed.
  product_code text NOT NULL,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  title_fr text NOT NULL,
  image_url text,
  -- {value, name_en, name_ar, name_fr}, or NULL for products without colors.
  color jsonb,
  -- Pieces per box.
  quantity_box integer NOT NULL,
  -- Number of boxes.
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 10000),
  -- Price of one box; NULL until the admin sets it.
  unit_price numeric(12, 2) CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items (product_id);

-- ---------------------------------------------------------------------------
-- RLS: customers read their own orders, admins read all. No direct writes.
-- ---------------------------------------------------------------------------

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders, admins view all"
ON public.orders FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY "Users can view own order items, admins view all"
ON public.order_items FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.user_id = (SELECT auth.uid())
  )
);

REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM authenticated;

-- ---------------------------------------------------------------------------
-- Checkout
-- ---------------------------------------------------------------------------

-- p_items: [{ "product_id": 1, "quantity": 2, "color": "#ffffff" | null }]
CREATE FUNCTION public.place_order(
  p_items jsonb,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_notes text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := (SELECT auth.uid());
  v_customer_name text := btrim(COALESCE(p_customer_name, ''));
  v_phone text := btrim(COALESCE(p_phone, ''));
  v_address text := btrim(COALESCE(p_address, ''));
  v_notes text := NULLIF(btrim(COALESCE(p_notes, '')), '');
  new_order_id bigint;
  item jsonb;
  qty numeric;
  chosen_color jsonb;
  p public.products%ROWTYPE;
  lines jsonb := '[]'::jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to place an order' USING ERRCODE = '42501';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'The cart is empty';
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'Too many items in one order';
  END IF;
  IF v_customer_name = '' OR v_phone = '' OR v_address = '' THEN
    RAISE EXCEPTION 'Name, phone and address are required';
  END IF;

  -- Validate every line and copy the catalog data before inserting anything,
  -- so a rejected checkout does not use up an order number.
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(item->'product_id') IS DISTINCT FROM 'number'
       OR jsonb_typeof(item->'quantity') IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'Invalid cart item';
    END IF;
    qty := (item->>'quantity')::numeric;
    IF qty <> trunc(qty) OR qty < 1 OR qty > 10000 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT * INTO p FROM public.products WHERE id = (item->>'product_id')::bigint;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % is no longer available', item->>'product_id';
    END IF;

    chosen_color := NULL;
    IF jsonb_array_length(COALESCE(p.colors, '[]'::jsonb)) > 0 THEN
      SELECT c INTO chosen_color
      FROM jsonb_array_elements(p.colors) c
      WHERE c->>'value' = item->>'color'
      LIMIT 1;
      IF chosen_color IS NULL THEN
        RAISE EXCEPTION 'Please choose a valid color for product %', p.code;
      END IF;
    END IF;

    lines := lines || jsonb_build_object(
      'product_id', p.id,
      'product_code', p.code,
      'title_en', p.title_en,
      'title_ar', p.title_ar,
      'title_fr', p.title_fr,
      'image_url', COALESCE(p.primary_image_url, p.images[1]),
      'color', chosen_color,
      'quantity_box', p.quantity_box,
      'quantity', qty,
      'unit_price', p.price
    );
  END LOOP;

  INSERT INTO public.orders (user_id, customer_name, phone, address, notes)
  VALUES (uid, v_customer_name, v_phone, v_address, v_notes)
  RETURNING id INTO new_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, product_code, title_en, title_ar, title_fr,
    image_url, color, quantity_box, quantity, unit_price
  )
  SELECT
    new_order_id, l.product_id, l.product_code, l.title_en, l.title_ar, l.title_fr,
    l.image_url, NULLIF(l.color, 'null'::jsonb), l.quantity_box, l.quantity, l.unit_price
  FROM jsonb_to_recordset(lines) AS l(
    product_id bigint, product_code text, title_en text, title_ar text, title_fr text,
    image_url text, color jsonb, quantity_box integer, quantity integer, unit_price numeric
  );

  PERFORM public.recalculate_order_total(new_order_id);
  RETURN new_order_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.recalculate_order_total(p_order_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.orders o
  SET total = (
    SELECT CASE WHEN bool_and(i.unit_price IS NOT NULL)
                THEN sum(i.unit_price * i.quantity) END
    FROM public.order_items i
    WHERE i.order_id = o.id
  )
  WHERE o.id = p_order_id;
$$;

-- Orders only move one step forward, or to cancelled before completion.
CREATE FUNCTION public.admin_set_order_status(p_order_id bigint, p_status public.order_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_status public.order_status;
  expected public.order_status;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO current_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF p_status = 'cancelled' THEN
    IF current_status IN ('completed', 'cancelled') THEN
      RAISE EXCEPTION 'A % order cannot be cancelled', current_status;
    END IF;
  ELSE
    expected := CASE current_status
      WHEN 'new' THEN 'confirmed'
      WHEN 'confirmed' THEN 'processing'
      WHEN 'processing' THEN 'delivering'
      WHEN 'delivering' THEN 'completed'
    END;
    IF expected IS NULL OR p_status <> expected THEN
      RAISE EXCEPTION 'Cannot change status from % to %', current_status, p_status;
    END IF;
    IF p_status = 'confirmed' AND EXISTS (
      SELECT 1 FROM public.order_items WHERE order_id = p_order_id AND unit_price IS NULL
    ) THEN
      RAISE EXCEPTION 'Set a price for every item before confirming the order';
    END IF;
  END IF;

  UPDATE public.orders SET status = p_status WHERE id = p_order_id;
END;
$$;

-- Prices can be set or corrected while the order is still new.
CREATE FUNCTION public.admin_set_order_item_price(p_item_id bigint, p_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_order_id bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'Invalid price';
  END IF;

  SELECT i.order_id INTO target_order_id
  FROM public.order_items i
  JOIN public.orders o ON o.id = i.order_id
  WHERE i.id = p_item_id AND o.status = 'new'
  FOR UPDATE OF o;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prices can only be changed while the order is new';
  END IF;

  UPDATE public.order_items SET unit_price = p_price WHERE id = p_item_id;
  PERFORM public.recalculate_order_total(target_order_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_order_total(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_order_status(bigint, public.order_status) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_order_item_price(bigint, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_order_status(bigint, public.order_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_order_item_price(bigint, numeric) TO authenticated;
