import { Ban, Edit, MoreHorizontal, Trash2, Undo2 } from "lucide-react";
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
import { formatDate as formatDateWithPattern } from "@/lib/dates";
import { useTranslation } from "react-i18next";
import type { AdminUser } from "@/pages/Users";

// Brand names stay as-is; "email" is translated at render time.
const PROVIDER_LABELS: Record<string, string> = {
  phone: "WhatsApp",
  google: "Google",
  facebook: "Facebook",
};

interface UsersTableProps {
  users: AdminUser[];
  loading: boolean;
  onEdit: (user: AdminUser) => void;
  onToggleBanned: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  emptyMessage?: string;
}

const formatDate = (value: string | null) =>
  value ? formatDateWithPattern(value, "PP") : "-";

export function UsersTable({
  users,
  loading,
  onEdit,
  onToggleBanned,
  onDelete,
  emptyMessage,
}: UsersTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className="text-center py-8">{t("users.loading")}</div>;
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">{emptyMessage ?? t("users.empty")}</div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("users.name")}</TableHead>
            <TableHead>{t("users.phone")}</TableHead>
            <TableHead>{t("users.email")}</TableHead>
            <TableHead>{t("users.signedUpWith")}</TableHead>
            <TableHead>{t("users.joined")}</TableHead>
            <TableHead>{t("users.lastSignIn")}</TableHead>
            <TableHead>{t("users.status")}</TableHead>
            <TableHead className="text-end">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const name = `${user.first_name} ${user.last_name}`.trim();

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {name || <span className="text-muted-foreground">{t("users.noName")}</span>}
                </TableCell>
                <TableCell dir="ltr" className="whitespace-nowrap">
                  {formatPhone(user.phone) || "-"}
                </TableCell>
                <TableCell dir="ltr" className="rtl:text-right">{user.email || "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.providers.map((provider) => (
                      <Badge key={provider} variant="outline">
                        {provider === "email" ? t("users.providerEmail") : (PROVIDER_LABELS[provider] ?? provider)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(user.created_at)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(user.last_sign_in_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.banned ? (
                      <Badge variant="destructive">{t("users.badgeBlocked")}</Badge>
                    ) : (
                      <Badge variant="secondary">{t("users.badgeActive")}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-label={t("common.moreActions")}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onToggleBanned(user)}>
                          {user.banned ? (
                            <>
                              <Undo2 className="h-4 w-4 me-2" />
                              {t("users.unblock")}
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4 me-2" />
                              {t("users.block")}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(user)}
                        >
                          <Trash2 className="h-4 w-4 me-2" />
                          {t("common.delete")}
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
