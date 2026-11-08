import { useEffect, useState } from "react";
import { ArrowRight, RotateCcw, XCircle } from "lucide-react";
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
  type OrderItem,
  type OrderStatus,
  type OrderWithItems,
  canCancel,
  formatMAD,
  hasMissingPrices,
  nextStatus,
} from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { formatDate } from "@/lib/dates";
import { localizedField } from "@/lib/localized";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/i18n";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithItems | null;
  onSetStatus: (order: OrderWithItems, status: OrderStatus) => void;
  onRestore: (order: OrderWithItems) => void;
  onSetPrice: (item: OrderItem, price: number) => Promise<boolean>;
}

export function OrderDialog({ open, onOpenChange, order, onSetStatus, onRestore, onSetPrice }: OrderDialogProps) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
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
            {t("orders.orderNumber", { id: order.id })}
            <OrderStatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription>
            {t("orders.placed", { date: formatDate(order.created_at, "PPpp") })}
            {order.updated_at !== order.created_at &&
              t("orders.lastUpdated", { date: formatDate(order.updated_at, "PPpp") })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">{t("orders.customer")}</p>
            <p className="font-medium">{order.customer_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("orders.phone")}</p>
            <p className="font-medium">
              <a href={`tel:${formatPhone(order.phone)}`} className="hover:underline">
                {formatPhone(order.phone)}
              </a>
            </p>
          </div>
          <div className="sm:col-span-3">
            <p className="text-muted-foreground">{t("orders.deliveryAddress")}</p>
            <p className="font-medium whitespace-pre-line">{order.address}</p>
          </div>
          {order.notes && (
            <div className="sm:col-span-3">
              <p className="text-muted-foreground">{t("orders.notes")}</p>
              <p className="whitespace-pre-line">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("orders.product")}</TableHead>
                <TableHead>{t("orders.color")}</TableHead>
                <TableHead className="text-end">{t("orders.boxes")}</TableHead>
                <TableHead className="text-end">{t("orders.pcsPerBox")}</TableHead>
                <TableHead className="text-end">{t("orders.pricePerBox")}</TableHead>
                <TableHead className="text-end">{t("orders.total")}</TableHead>
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
                          <p className="font-medium">{localizedField(item, "title", lang)}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{item.product_code}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {color ? (
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <span className="h-4 w-4 rounded-full border" style={getColorSwatchStyle(color.value)} />
                          {getColorName(color, lang)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-end">{item.quantity}</TableCell>
                    <TableCell className="text-end">{item.quantity_box}</TableCell>
                    <TableCell className="text-end">
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
                            placeholder={t("orders.currency")}
                            className="h-8 w-24"
                            value={draft ?? ""}
                            onChange={(e) => setPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                          />
                          <Button type="submit" size="sm" disabled={!draft || savingItemId === item.id}>
                            {t("common.save")}
                          </Button>
                        </form>
                      ) : item.unit_price != null ? (
                        <button
                          type="button"
                          className={pricesEditable ? "hover:underline" : undefined}
                          disabled={!pricesEditable}
                          title={pricesEditable ? t("orders.changePrice") : undefined}
                          onClick={() => setPrices((p) => ({ ...p, [item.id]: String(item.unit_price) }))}
                        >
                          {formatMAD(item.unit_price)}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">{t("orders.toConfirm")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-end whitespace-nowrap">
                      {item.unit_price != null ? formatMAD(item.unit_price * item.quantity) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={5} className="text-end font-semibold">
                  {t("orders.orderTotal")}
                </TableCell>
                <TableCell className="text-end font-semibold whitespace-nowrap">
                  {order.total != null ? formatMAD(order.total) : t("orders.toConfirm")}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {pricesEditable && missingPrices && (
          <p className="text-sm text-muted-foreground">
            {t("orders.missingPricesNote")}
          </p>
        )}

        <DialogFooter>
          {order.status === "cancelled" && (
            <Button variant="outline" onClick={() => onRestore(order)}>
              <RotateCcw className="h-4 w-4 me-2" />
              {t("orders.restore")}
            </Button>
          )}
          {canCancel(order.status) && (
            <Button variant="outline" className="text-destructive" onClick={() => onSetStatus(order, "cancelled")}>
              <XCircle className="h-4 w-4 me-2" />
              {t("orders.actions.cancelled")}
            </Button>
          )}
          {next && (
            <Button
              onClick={() => onSetStatus(order, next)}
              disabled={next === "confirmed" && missingPrices}
            >
              <ArrowRight className="h-4 w-4 me-2 rtl:rotate-180" />
              {t(`orders.actions.${next}`)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
