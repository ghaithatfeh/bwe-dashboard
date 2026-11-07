import { ArrowRight, Eye, MoreHorizontal, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import {
  type OrderStatus,
  type OrderWithItems,
  canCancel,
  formatMAD,
  hasMissingPrices,
  nextStatus,
  totalBoxes,
} from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { formatDate } from "@/lib/dates";
import { useTranslation } from "react-i18next";

interface OrdersTableProps {
  orders: OrderWithItems[];
  loading: boolean;
  onView: (order: OrderWithItems) => void;
  onSetStatus: (order: OrderWithItems, status: OrderStatus) => void;
  emptyMessage?: string;
}

export function OrdersTable({
  orders,
  loading,
  onView,
  onSetStatus,
  emptyMessage,
}: OrdersTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className="text-center py-8">{t("orders.loading")}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">{emptyMessage ?? t("orders.empty")}</div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("orders.order")}</TableHead>
            <TableHead>{t("orders.date")}</TableHead>
            <TableHead>{t("orders.customer")}</TableHead>
            <TableHead>{t("orders.phone")}</TableHead>
            <TableHead>{t("orders.items")}</TableHead>
            <TableHead>{t("orders.total")}</TableHead>
            <TableHead>{t("orders.status")}</TableHead>
            <TableHead className="text-end">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const next = nextStatus(order.status);
            const blocked = next === "confirmed" && hasMissingPrices(order);
            const boxes = totalBoxes(order);

            return (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.id}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(order.created_at, "PP p")}
                </TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell dir="ltr" className="whitespace-nowrap">
                  {formatPhone(order.phone)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {t("orders.productCount", { count: order.order_items.length })}
                  <span className="text-muted-foreground"> · {t("orders.boxCount", { count: boxes })}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {order.total != null ? (
                    formatMAD(order.total)
                  ) : (
                    <Badge variant="outline">{t("orders.priceToConfirm")}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onView(order)} aria-label={t("orders.view")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!next && !canCancel(order.status)}
                          aria-label={t("common.moreActions")}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {next && (
                          <DropdownMenuItem
                            disabled={blocked}
                            onClick={() => onSetStatus(order, next)}
                          >
                            <ArrowRight className="h-4 w-4 me-2 rtl:rotate-180" />
                            {t(`orders.actions.${next}`)}
                            {blocked && t("orders.setPricesFirst")}
                          </DropdownMenuItem>
                        )}
                        {canCancel(order.status) && (
                          <>
                            {next && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onSetStatus(order, "cancelled")}
                            >
                              <XCircle className="h-4 w-4 me-2" />
                              {t("orders.actions.cancelled")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
