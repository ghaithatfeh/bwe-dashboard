import { KeyRound, MoreHorizontal, Power, PowerOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { formatDate as formatDateWithPattern } from "@/lib/dates";
import type { Admin } from "@/pages/Admins";

interface AdminsTableProps {
  admins: Admin[];
  loading: boolean;
  currentUserId: string | null;
  /** Only the super admin gets the row actions. */
  canManage: boolean;
  onSetPassword: (admin: Admin) => void;
  onToggleActive: (admin: Admin) => void;
}

const formatDate = (value: string | null) => (value ? formatDateWithPattern(value, "PP") : "-");

export function AdminsTable({
  admins,
  loading,
  currentUserId,
  canManage,
  onSetPassword,
  onToggleActive,
}: AdminsTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className="text-center py-8">{t("admins.loading")}</div>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("users.name")}</TableHead>
            <TableHead>{t("users.email")}</TableHead>
            <TableHead>{t("users.joined")}</TableHead>
            <TableHead>{t("users.lastSignIn")}</TableHead>
            <TableHead>{t("users.status")}</TableHead>
            {canManage && <TableHead className="text-end">{t("common.actions")}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => {
            const name = `${admin.first_name} ${admin.last_name}`.trim();

            return (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">
                  {name || <span className="text-muted-foreground">{t("users.noName")}</span>}
                  {admin.id === currentUserId && <span className="text-muted-foreground">{t("users.you")}</span>}
                </TableCell>
                <TableCell dir="ltr" className="rtl:text-right">{admin.email || "-"}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(admin.created_at)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(admin.last_sign_in_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {admin.is_super_admin && <Badge>{t("admins.badgeSuper")}</Badge>}
                    {admin.active ? (
                      <Badge variant="secondary">{t("users.badgeActive")}</Badge>
                    ) : (
                      <Badge variant="destructive">{t("admins.badgeDeactivated")}</Badge>
                    )}
                  </div>
                </TableCell>
                {canManage && (
                  <TableCell className="text-end">
                    {/* The super admin manages their own account via "Change password". */}
                    {!admin.is_super_admin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" aria-label={t("common.moreActions")}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSetPassword(admin)}>
                            <KeyRound className="h-4 w-4 me-2" />
                            {t("admins.setPassword")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={admin.active ? "text-destructive focus:text-destructive" : undefined}
                            onClick={() => onToggleActive(admin)}
                          >
                            {admin.active ? (
                              <>
                                <PowerOff className="h-4 w-4 me-2" />
                                {t("admins.deactivate")}
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 me-2" />
                                {t("admins.activate")}
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
