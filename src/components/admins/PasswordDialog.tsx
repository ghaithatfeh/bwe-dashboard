import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MIN_PASSWORD_LENGTH, callAdminUsers, verifyPassword } from "@/lib/admin";

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Another admin whose password the super admin is setting. Omit to change
   * the signed-in admin's own password, which asks for the current one.
   */
  target?: { id: string; name: string } | null;
}

const emptyForm = { current: "", password: "", confirm: "" };

export function PasswordDialog({ open, onOpenChange, target }: PasswordDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const isOwn = !target;

  useEffect(() => {
    if (open) setFormData(emptyForm);
  }, [open]);

  const showError = (description: string) =>
    toast({ variant: "destructive", title: t("common.error"), description });

  const changeOwnPassword = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email || !(await verifyPassword(email, formData.current))) {
      return t("password.currentWrong");
    }
    const { error } = await supabase.auth.updateUser({ password: formData.password });
    return error?.message ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirm) {
      showError(t("password.mismatch"));
      return;
    }

    setLoading(true);
    const error = isOwn
      ? await changeOwnPassword()
      : await callAdminUsers({ action: "set_password", user_id: target.id, password: formData.password });
    setLoading(false);

    if (error) {
      showError(error);
      return;
    }
    toast({ title: t("common.success"), description: t("password.changed") });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isOwn ? t("password.changeOwn") : t("password.setFor", { name: target.name })}</DialogTitle>
          <DialogDescription>{isOwn ? t("password.changeOwnDesc") : t("password.setForDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isOwn && (
            <div className="space-y-2">
              <Label htmlFor="current_password">{t("password.current")}</Label>
              <Input
                id="current_password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={formData.current}
                onChange={(e) => setFormData({ ...formData, current: e.target.value })}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="new_password">{t("password.new")}</Label>
            <Input
              id="new_password"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t("password.minLength", { count: MIN_PASSWORD_LENGTH })}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">{t("password.confirm")}</Label>
            <Input
              id="confirm_password"
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={formData.confirm}
              onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
