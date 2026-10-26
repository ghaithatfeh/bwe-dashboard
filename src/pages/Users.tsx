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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users",
      });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
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
    `${user.first_name} ${user.last_name}`.trim() || formatPhone(user.phone) || user.email || "this user";

  const runAction = async (
    action: () => PromiseLike<{ error: { message: string } | null }>,
    successMessage: string,
  ) => {
    const { error } = await action();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: successMessage,
      });
      fetchUsers();
    }
  };

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleToggleAdmin = (user: AdminUser) => {
    const makeAdmin = !user.is_admin;
    const question = makeAdmin
      ? `Give ${displayName(user)} full access to this dashboard?`
      : `Remove dashboard access for ${displayName(user)}?`;
    if (!confirm(question)) return;

    runAction(
      () => supabase.rpc("admin_set_user_admin", { target_user_id: user.id, make_admin: makeAdmin }),
      makeAdmin ? "User is now an admin" : "Admin access removed",
    );
  };

  const handleToggleBanned = (user: AdminUser) => {
    const banned = !user.banned;
    if (banned && !confirm(`Block ${displayName(user)}? They will be signed out and unable to sign in.`)) return;

    runAction(
      () => supabase.rpc("admin_set_user_banned", { target_user_id: user.id, banned }),
      banned ? "User blocked" : "User unblocked",
    );
  };

  const handleDelete = (user: AdminUser) => {
    if (!confirm(`Permanently delete ${displayName(user)}? This cannot be undone.`)) return;

    runAction(
      () => supabase.rpc("admin_delete_user", { target_user_id: user.id }),
      "User deleted successfully",
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">
          Manage website visitors' accounts and dashboard admins
        </p>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name, phone or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
          aria-label="Search users"
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

      <UsersTable
        users={paginatedItems}
        loading={loading}
        currentUserId={currentUserId}
        onEdit={handleEdit}
        onToggleAdmin={handleToggleAdmin}
        onToggleBanned={handleToggleBanned}
        onDelete={handleDelete}
        emptyMessage={
          searchQuery ? `No users match "${searchQuery.trim()}".` : undefined
        }
      />

      {!loading && (
        <ListPagination
          itemLabel="users"
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
