import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { AdminsTable } from "@/components/admins/AdminsTable";
import { CreateAdminDialog } from "@/components/admins/CreateAdminDialog";
import { PasswordDialog } from "@/components/admins/PasswordDialog";
import { useToast } from "@/hooks/use-toast";
import { isSuperAdmin } from "@/lib/admin";

export type Admin = Database["public"]["Functions"]["admin_list_admins"]["Returns"][number];

const Admins = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<Admin | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_admins");
    if (error) {
      toast({ variant: "destructive", title: t("common.error"), description: t("admins.fetchFailed") });
    } else {
      setAdmins(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    isSuperAdmin().then(setCanManage);
    fetchAdmins();
  }, []);

  const displayName = (admin: Admin) =>
    `${admin.first_name} ${admin.last_name}`.trim() || admin.email || t("users.thisUser");

  const handleToggleActive = async (admin: Admin) => {
    const active = !admin.active;
    if (!active && !confirm(t("admins.confirmDeactivate", { name: displayName(admin) }))) return;

    const { error } = await supabase.rpc("admin_set_admin_active", { target_user_id: admin.id, active });
    if (error) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
      return;
    }
    toast({ title: t("common.success"), description: active ? t("admins.activated") : t("admins.deactivated") });
    fetchAdmins();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("admins.title")}</h2>
          <p className="text-muted-foreground">
            {canManage ? t("admins.subtitle") : t("admins.subtitleReadOnly")}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t("admins.add")}
          </Button>
        )}
      </div>

      <AdminsTable
        admins={admins}
        loading={loading}
        currentUserId={currentUserId}
        canManage={canManage}
        onSetPassword={(admin) => {
          setPasswordTarget(admin);
          setPasswordOpen(true);
        }}
        onToggleActive={handleToggleActive}
      />

      <CreateAdminDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={fetchAdmins} />
      <PasswordDialog
        open={passwordOpen && passwordTarget !== null}
        onOpenChange={setPasswordOpen}
        target={passwordTarget && { id: passwordTarget.id, name: displayName(passwordTarget) }}
      />
    </div>
  );
};

export default Admins;
