import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ArrowRight, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { getColorName, getColorSwatchStyle, normalizeColors } from "@/lib/colors";
import {
  ORDER_STATUS_ACTIONS,
  type OrderItem,
  type OrderStatus,
  type OrderWithItems,
  canCancel,
  formatMAD,
  hasMissingPrices,
  nextStatus,
} from "@/lib/orders";
import { formatPhone } from "@/lib/phone";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithItems | null;
  onSetStatus: (order: OrderWithItems, status: OrderStatus) => void;
  onSetPrice: (item: OrderItem, price: number) => Promise<boolean>;
}

export function OrderDialog({ open, onOpenChange, order, onSetStatus, onSetPrice }: OrderDialogProps) {
  // Draft prices per item id, as typed.
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [savingItemId, setSavingItemId] = useState<number | null>(null);

  useEffect(() => {
    if (open) setPrices({});
  }, [open, order?.id]);

  if (!order) return null;

  const next = nextStatus(order.status);
  const missingPrices = hasMissingPrices(order);
  const pricesEditable = order.status === "new";

  const savePrice = async (item: OrderItem) => {
    const price = parseFloat(prices[item.id] ?? "");
    if (!Number.isFinite(price) || price < 0) return;
    setSavingItemId(item.id);
    const ok = await onSetPrice(item, price);
    setSavingItemId(null);
    if (ok) {
      setPrices((p) => {
        const rest = { ...p };
        delete rest[item.id];
        return rest;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Order #{order.id}
            <OrderStatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription>
            Placed {format(new Date(order.created_at), "PPpp")}
            {order.updated_at !== order.created_at &&
              ` · Last updated ${format(new Date(order.updated_at), "PPpp")}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">Customer</p>
            <p className="font-medium">{order.customer_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium" dir="ltr">
              <a href={`tel:${formatPhone(order.phone)}`} className="hover:underline">
                {formatPhone(order.phone)}
              </a>
            </p>
          </div>
          <div className="sm:col-span-3">
            <p className="text-muted-foreground">Delivery address</p>
            <p className="font-medium whitespace-pre-line">{order.address}</p>
          </div>
          {order.notes && (
            <div className="sm:col-span-3">
              <p className="text-muted-foreground">Notes</p>
              <p className="whitespace-pre-line">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Boxes</TableHead>
                <TableHead className="text-right">Pcs / box</TableHead>
                <TableHead className="text-right">Price / box</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.order_items.map((item) => {
                const [color] = normalizeColors(item.color ? [item.color] : []);
                const draft = prices[item.id];
                const editing = pricesEditable && (item.unit_price == null || draft !== undefined);

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.image_url && (
                          <img src={item.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                        )}
                        <div>
                          <p className="font-medium">{item.title_en}</p>
                          <p className="text-xs text-muted-foreground">{item.product_code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {color ? (
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <span className="h-4 w-4 rounded-full border" style={getColorSwatchStyle(color.value)} />
                          {getColorName(color, "en")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.quantity_box}</TableCell>
                    <TableCell className="text-right">
                      {editing ? (
                        <form
                          className="flex items-center justify-end gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            savePrice(item);
                          }}
                        >
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="MAD"
                            className="h-8 w-24"
                            value={draft ?? ""}
                            onChange={(e) => setPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                          />
                          <Button type="submit" size="sm" disabled={!draft || savingItemId === item.id}>
                            Save
                          </Button>
                        </form>
                      ) : item.unit_price != null ? (
                        <button
                          type="button"
                          className={pricesEditable ? "hover:underline" : undefined}
                          disabled={!pricesEditable}
                          title={pricesEditable ? "Change price" : undefined}
                          onClick={() => setPrices((p) => ({ ...p, [item.id]: String(item.unit_price) }))}
                        >
                          {formatMAD(item.unit_price)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">To confirm</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {item.unit_price != null ? formatMAD(item.unit_price * item.quantity) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={5} className="text-right font-semibold">
                  Order total
                </TableCell>
                <TableCell className="text-right font-semibold whitespace-nowrap">
                  {order.total != null ? formatMAD(order.total) : "To confirm"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {pricesEditable && missingPrices && (
          <p className="text-sm text-muted-foreground">
            Some products had no price when the order was placed. Set a price per box for each of them before
            confirming the order.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {canCancel(order.status) && (
            <Button variant="outline" className="text-destructive" onClick={() => onSetStatus(order, "cancelled")}>
              <XCircle className="h-4 w-4 mr-2" />
              {ORDER_STATUS_ACTIONS.cancelled}
            </Button>
          )}
          {next && (
            <Button
              onClick={() => onSetStatus(order, next)}
              disabled={next === "confirmed" && missingPrices}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              {ORDER_STATUS_ACTIONS[next]}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
