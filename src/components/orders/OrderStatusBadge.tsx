import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { ORDER_STATUS_CLASSES, type OrderStatus } from "@/lib/orders";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  return <Badge className={ORDER_STATUS_CLASSES[status]}>{t(`orders.statuses.${status}`)}</Badge>;
}
