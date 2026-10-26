import { format } from "date-fns";
import { Ban, Edit, MoreHorizontal, ShieldCheck, ShieldOff, Trash2, Undo2 } from "lucide-react";
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
import { formatPhone } from "@/lib/phone";
import type { AdminUser } from "@/pages/Users";

const PROVIDER_LABELS: Record<string, string> = {
  phone: "WhatsApp",
  google: "Google",
  facebook: "Facebook",
  email: "Email",
};

interface UsersTableProps {
  users: AdminUser[];
  loading: boolean;
  /** The signed-in admin; they cannot block, demote or delete themselves. */
  currentUserId: string | null;
  onEdit: (user: AdminUser) => void;
  onToggleAdmin: (user: AdminUser) => void;
  onToggleBanned: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  emptyMessage?: string;
}

const formatDate = (value: string | null) =>
  value ? format(new Date(value), "PP") : "-";

export function UsersTable({
  users,
  loading,
  currentUserId,
  onEdit,
  onToggleAdmin,
  onToggleBanned,
  onDelete,
  emptyMessage = "No users have signed up yet.",
}: UsersTableProps) {
  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Signed up with</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Last sign-in</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            const name = `${user.first_name} ${user.last_name}`.trim();

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {name || <span className="text-muted-foreground">No name</span>}
                  {isSelf && <span className="text-muted-foreground"> (you)</span>}
                </TableCell>
                <TableCell dir="ltr" className="whitespace-nowrap">
                  {formatPhone(user.phone) || "-"}
                </TableCell>
                <TableCell>{user.email || "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.providers.map((provider) => (
                      <Badge key={provider} variant="outline">
                        {PROVIDER_LABELS[provider] ?? provider}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(user.created_at)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(user.last_sign_in_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.is_admin && <Badge>Admin</Badge>}
                    {user.banned ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      !user.is_admin && <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSelf}
                          aria-label="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onToggleAdmin(user)}>
                          {user.is_admin ? (
                            <>
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remove admin access
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Make admin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleBanned(user)}>
                          {user.banned ? (
                            <>
                              <Undo2 className="h-4 w-4 mr-2" />
                              Unblock
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4 mr-2" />
                              Block
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(user)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
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
