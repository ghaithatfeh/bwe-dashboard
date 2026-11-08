-- Let admins undo a cancellation.
--
-- The order goes back to the status it had when it was cancelled, which is
-- now remembered in cancelled_from. Orders cancelled before this migration
-- have no record, so they go back to 'new'.

ALTER TABLE public.orders ADD COLUMN cancelled_from public.order_status
  CHECK (cancelled_from IS NULL OR cancelled_from NOT IN ('completed', 'cancelled'));

-- Same rules as before; cancelling now also records the status it came from.
CREATE OR REPLACE FUNCTION public.admin_set_order_status(p_order_id bigint, p_status public.order_status)
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
    UPDATE public.orders SET status = 'cancelled', cancelled_from = current_status WHERE id = p_order_id;
    RETURN;
  END IF;

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

  UPDATE public.orders SET status = p_status WHERE id = p_order_id;
END;
$$;

-- Returns the status the order was restored to.
CREATE FUNCTION public.admin_restore_order(p_order_id bigint)
RETURNS public.order_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_status public.order_status;
  restored public.order_status;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT status, COALESCE(cancelled_from, 'new') INTO current_status, restored
  FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF current_status <> 'cancelled' THEN
    RAISE EXCEPTION 'Only cancelled orders can be restored';
  END IF;

  UPDATE public.orders SET status = restored, cancelled_from = NULL WHERE id = p_order_id;
  RETURN restored;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_restore_order(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_order(bigint) TO authenticated;
