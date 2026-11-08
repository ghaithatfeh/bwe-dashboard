import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { UsersTable } from "@/components/users/UsersTable";
import { UserDialog } from "@/components/users/UserDialog";
import { ListPagination } from "@/components/ListPagination";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/use-toast";
import { formatPhone } from "@/lib/phone";
import { useTranslation } from "react-i18next";

export type AdminUser = Database["public"]["Functions"]["admin_list_users"]["Returns"][number];

const USERS_PER_PAGE = 10;

const matchesSearch = (user: AdminUser, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return (
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(q) ||
    (user.email ?? "").toLowerCase().includes(q) ||
    (digits.length > 0 && (user.phone ?? "").includes(digits))
  );
};

const Users = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users");

    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("users.fetchFailed"),
      });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(
    () => users.filter((user) => matchesSearch(user, searchQuery)),
    [users, searchQuery],
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
    items: filteredUsers,
    pageSize: USERS_PER_PAGE,
    resetKey: searchQuery.trim().toLowerCase(),
  });

  const displayName = (user: AdminUser) =>
    `${user.first_name} ${user.last_name}`.trim() || formatPhone(user.phone) || user.email || t("users.thisUser");

  const runAction = async (
    action: () => PromiseLike<{ error: { message: string } | null }>,
    successMessage: string,
  ) => {
    const { error } = await action();

    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } else {
      toast({
        title: t("common.success"),
        description: successMessage,
      });
      fetchUsers();
    }
  };

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleToggleBanned = (user: AdminUser) => {
    const banned = !user.banned;
    if (banned && !confirm(t("users.confirmBlock", { name: displayName(user) }))) return;

    runAction(
      () => supabase.rpc("admin_set_user_banned", { target_user_id: user.id, banned }),
      banned ? t("users.blocked") : t("users.unblocked"),
    );
  };

  const handleDelete = (user: AdminUser) => {
    if (!confirm(t("users.confirmDelete", { name: displayName(user) }))) return;

    runAction(
      () => supabase.rpc("admin_delete_user", { target_user_id: user.id }),
      t("users.deleted"),
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("users.title")}</h2>
        <p className="text-muted-foreground">
          {t("users.subtitle")}
        </p>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("users.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9 pe-9"
          aria-label={t("users.searchLabel")}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={t("common.clearSearch")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <UsersTable
        users={paginatedItems}
        loading={loading}
        onEdit={handleEdit}
        onToggleBanned={handleToggleBanned}
        onDelete={handleDelete}
        emptyMessage={
          searchQuery ? t("users.noMatch", { query: searchQuery.trim() }) : undefined
        }
      />

      {!loading && (
        <ListPagination
          itemLabel={t("users.itemLabel")}
          currentPage={currentPage}
          totalPages={totalPages}
          pageRange={pageRange}
          firstItemIndex={firstItemIndex}
          lastItemIndex={lastItemIndex}
          totalItems={totalItems}
          onPageChange={goToPage}
        />
      )}

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
        onSuccess={fetchUsers}
      />
    </div>
  );
};

export default Users;
