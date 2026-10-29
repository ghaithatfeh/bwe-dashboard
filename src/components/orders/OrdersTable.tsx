import { format } from "date-fns";
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
  ORDER_STATUS_ACTIONS,
  type OrderStatus,
  type OrderWithItems,
  canCancel,
  formatMAD,
  hasMissingPrices,
  nextStatus,
  totalBoxes,
} from "@/lib/orders";
import { formatPhone } from "@/lib/phone";

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
  emptyMessage = "No orders yet.",
}: OrdersTableProps) {
  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                  {format(new Date(order.created_at), "PP p")}
                </TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell dir="ltr" className="whitespace-nowrap">
                  {formatPhone(order.phone)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {order.order_items.length} {order.order_items.length === 1 ? "product" : "products"}
                  <span className="text-muted-foreground"> · {boxes} {boxes === 1 ? "box" : "boxes"}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {order.total != null ? (
                    formatMAD(order.total)
                  ) : (
                    <Badge variant="outline">Price to confirm</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onView(order)} aria-label="View order">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!next && !canCancel(order.status)}
                          aria-label="More actions"
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
                            <ArrowRight className="h-4 w-4 mr-2" />
                            {ORDER_STATUS_ACTIONS[next]}
                            {blocked && " (set prices first)"}
                          </DropdownMenuItem>
                        )}
                        {canCancel(order.status) && (
                          <>
                            {next && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => onSetStatus(order, "cancelled")}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {ORDER_STATUS_ACTIONS.cancelled}
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
