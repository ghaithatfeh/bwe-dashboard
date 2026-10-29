import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderWithItems = Order & { order_items: OrderItem[] };

/** The forward path; "cancelled" sits outside it. */
export const ORDER_FLOW: OrderStatus[] = ["new", "confirmed", "processing", "delivering", "completed"];

export const ORDER_STATUSES: OrderStatus[] = [...ORDER_FLOW, "cancelled"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  processing: "Processing",
  delivering: "Delivering",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Label for the button that moves an order to this status. */
export const ORDER_STATUS_ACTIONS: Record<OrderStatus, string> = {
  new: "Mark as new",
  confirmed: "Confirm order",
  processing: "Start processing",
  delivering: "Send for delivery",
  completed: "Mark as completed",
  cancelled: "Cancel order",
};

export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  new: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100",
  confirmed: "border-transparent bg-indigo-100 text-indigo-800 hover:bg-indigo-100",
  processing: "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-100",
  delivering: "border-transparent bg-orange-100 text-orange-800 hover:bg-orange-100",
  completed: "border-transparent bg-green-100 text-green-800 hover:bg-green-100",
  cancelled: "border-transparent bg-gray-200 text-gray-700 hover:bg-gray-200",
};

// These mirror the rules enforced by admin_set_order_status() in the database.

export const nextStatus = (status: OrderStatus): OrderStatus | null => {
  const index = ORDER_FLOW.indexOf(status);
  return index >= 0 && index < ORDER_FLOW.length - 1 ? ORDER_FLOW[index + 1] : null;
};

export const canCancel = (status: OrderStatus) => status !== "completed" && status !== "cancelled";

export const hasMissingPrices = (order: OrderWithItems) =>
  order.order_items.some((item) => item.unit_price == null);

export const totalBoxes = (order: OrderWithItems) =>
  order.order_items.reduce((sum, item) => sum + item.quantity, 0);

export const formatMAD = (value: number) =>
  new Intl.NumberFormat("en-MA", {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
