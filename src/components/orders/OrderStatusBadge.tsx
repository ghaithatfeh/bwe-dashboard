import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_CLASSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={ORDER_STATUS_CLASSES[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
