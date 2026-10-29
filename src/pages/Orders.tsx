import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrderDialog } from "@/components/orders/OrderDialog";
import { ListPagination } from "@/components/ListPagination";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/use-toast";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderItem,
  type OrderStatus,
  type OrderWithItems,
} from "@/lib/orders";

const ORDERS_PER_PAGE = 10;

type StatusFilter = OrderStatus | "all";

const matchesSearch = (order: OrderWithItems, query: string) => {
  const q = query.trim().toLowerCase().replace(/^#/, "");
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return (
    String(order.id) === q ||
    order.customer_name.toLowerCase().includes(q) ||
    (digits.length > 0 && order.phone.replace(/\D/g, "").includes(digits))
  );
};

const Orders = () => {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  // Kept as an id so the dialog shows the refreshed order after each change.
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .order("id", { referencedTable: "order_items", ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch orders",
      });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: orders.length } as Record<StatusFilter, number>;
    for (const status of ORDER_STATUSES) counts[status] = 0;
    for (const order of orders) counts[order.status] += 1;
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (statusFilter === "all" || order.status === statusFilter) && matchesSearch(order, searchQuery),
      ),
    [orders, statusFilter, searchQuery],
  );

  const {
    currentPage,
    totalPages,
    totalItems,
    paginatedItems,
    pageRange,
    goToPage,
    firstItemIndex,
    lastItemIndex,
  } = usePagination({
    items: filteredOrders,
    pageSize: ORDERS_PER_PAGE,
    resetKey: `${statusFilter}|${searchQuery.trim().toLowerCase()}`,
  });

  const viewingOrder = orders.find((order) => order.id === viewingOrderId) ?? null;

  const handleView = (order: OrderWithItems) => {
    setViewingOrderId(order.id);
    setDialogOpen(true);
  };

  const handleSetStatus = async (order: OrderWithItems, status: OrderStatus) => {
    if (status === "cancelled" && !confirm(`Cancel order #${order.id} from ${order.customer_name}?`)) return;

    const { error } = await supabase.rpc("admin_set_order_status", {
      p_order_id: order.id,
      p_status: status,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: `Order #${order.id} is now ${ORDER_STATUS_LABELS[status].toLowerCase()}`,
      });
      fetchOrders(false);
    }
  };

  const handleSetPrice = async (item: OrderItem, price: number) => {
    const { error } = await supabase.rpc("admin_set_order_item_price", {
      p_item_id: item.id,
      p_price: price,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      return false;
    }
    toast({
      title: "Success",
      description: `Price updated for ${item.product_code}`,
    });
    await fetchOrders(false);
    return true;
  };

  const filterLabel = statusFilter === "all" ? "" : ` ${ORDER_STATUS_LABELS[statusFilter].toLowerCase()}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
        <p className="text-muted-foreground">
          Review orders placed on the website and update their status
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
            {ORDER_STATUSES.map((status) => (
              <TabsTrigger key={status} value={status}>
                {ORDER_STATUS_LABELS[status]} ({statusCounts[status]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by order #, name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search orders"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <OrdersTable
        orders={paginatedItems}
        loading={loading}
        onView={handleView}
        onSetStatus={handleSetStatus}
        emptyMessage={
          searchQuery
            ? `No${filterLabel} orders match "${searchQuery.trim()}".`
            : statusFilter !== "all"
              ? `No${filterLabel} orders.`
              : undefined
        }
      />

      {!loading && (
        <ListPagination
          itemLabel="orders"
          currentPage={currentPage}
          totalPages={totalPages}
          pageRange={pageRange}
          firstItemIndex={firstItemIndex}
          lastItemIndex={lastItemIndex}
          totalItems={totalItems}
          onPageChange={goToPage}
        />
      )}

      <OrderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={viewingOrder}
        onSetStatus={handleSetStatus}
        onSetPrice={handleSetPrice}
      />
    </div>
  );
};

export default Orders;
