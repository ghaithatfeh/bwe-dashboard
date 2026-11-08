import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatPhone } from "@/lib/phone";
import { countryOptions } from "@/lib/countries";
import { useLanguage } from "@/i18n";
import { useTranslation } from "react-i18next";
import type { AdminUser } from "@/pages/Users";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  nickname: "",
  email: "",
  country: "",
  city: "",
  address: "",
  shipping_company_name: "",
  shipping_company_phone: "",
};
type UserForm = typeof EMPTY_FORM;

const PHONE = /^[0-9+()\s-]+$/;

/** Radix Select cannot hold an empty value, so "no country" uses a sentinel. */
const NO_COUNTRY = "none";

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-muted-foreground pt-2">{children}</h3>
);

export function UserDialog({ open, onOpenChange, user, onSuccess }: UserDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserForm>(EMPTY_FORM);
  const countries = useMemo(() => countryOptions(lang), [lang]);

  // The users list only carries the basics; load the full profile.
  useEffect(() => {
    if (!open || !user) return;
    setFormData({
      ...EMPTY_FORM,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email ?? "",
      address: user.address ?? "",
    });

    supabase
      .from("profiles")
      .select("nickname, country, city, shipping_company_name, shipping_company_phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setFormData((f) => ({
          ...f,
          nickname: data.nickname ?? "",
          country: data.country ?? "",
          city: data.city ?? "",
          shipping_company_name: data.shipping_company_name ?? "",
          shipping_company_phone: data.shipping_company_phone ?? "",
        }));
      });
  }, [open, user]);

  const field = (key: keyof UserForm) => ({
    value: formData[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData((f) => ({ ...f, [key]: e.target.value })),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const shippingPhone = formData.shipping_company_phone.trim();
    if (shippingPhone && !PHONE.test(shippingPhone)) {
      toast({ variant: "destructive", title: t("common.error"), description: t("users.invalidShippingPhone") });
      return;
    }

    setLoading(true);
    const optional = (value: string) => value.trim() || null;
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        nickname: optional(formData.nickname),
        email: optional(formData.email),
        country: optional(formData.country),
        city: optional(formData.city),
        address: optional(formData.address),
        shipping_company_name: optional(formData.shipping_company_name),
        shipping_company_phone: shippingPhone || null,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } else {
      toast({
        title: t("common.success"),
        description: t("users.updated"),
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("users.edit")}</DialogTitle>
          <DialogDescription>
            {t("users.editDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <SectionTitle>{t("users.sectionPersonal")}</SectionTitle>
          <div className="space-y-2">
            <Label>{t("users.phone")}</Label>
            <Input value={formatPhone(user?.phone) || "-"} dir="ltr" className="rtl:text-right" disabled />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t("users.firstName")}</Label>
              <Input id="first_name" {...field("first_name")} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t("users.lastName")}</Label>
              <Input id="last_name" {...field("last_name")} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">{t("users.nickname")}</Label>
              <Input id="nickname" {...field("nickname")} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("users.email")}</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                className="rtl:text-right"
                {...field("email")}
                maxLength={255}
              />
            </div>
          </div>

          <SectionTitle>{t("users.sectionAddress")}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">{t("users.country")}</Label>
              <Select
                value={formData.country || NO_COUNTRY}
                onValueChange={(value) =>
                  setFormData((f) => ({ ...f, country: value === NO_COUNTRY ? "" : value }))
                }
              >
                <SelectTrigger id="country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COUNTRY}>{t("users.noCountry")}</SelectItem>
                  {countries.map(({ code, name }) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t("users.city")}</Label>
              <Input id="city" {...field("city")} maxLength={100} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{t("users.addressLine")}</Label>
            <Textarea id="address" {...field("address")} maxLength={500} />
          </div>

          <SectionTitle>{t("users.sectionShipping")}</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shipping_company_name">{t("users.shippingCompanyName")}</Label>
              <Input id="shipping_company_name" {...field("shipping_company_name")} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_company_phone">{t("users.shippingCompanyPhone")}</Label>
              <Input
                id="shipping_company_phone"
                type="tel"
                dir="ltr"
                className="rtl:text-right"
                {...field("shipping_company_phone")}
                maxLength={30}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
