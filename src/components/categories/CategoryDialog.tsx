import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Category } from "@/pages/Categories";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/i18n";
import { localizedField } from "@/lib/localized";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  categories: Category[];
  onSuccess: () => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  categories,
  onSuccess,
}: CategoryDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title_en: "",
    title_ar: "",
    title_fr: "",
    parent_id: null as number | null,
  });

  const hasSubcategories = category?.categories?.length;

  useEffect(() => {
    if (category) {
      setFormData({
        title_en: category.title_en,
        title_ar: category.title_ar,
        title_fr: category.title_fr,
        parent_id: category.parent_id,
      });
    } else {
      setFormData({
        title_en: "",
        title_ar: "",
        title_fr: "",
        parent_id: null,
      });
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = category
      ? await supabase
          .from("categories")
          .update(formData)
          .eq("id", category.id)
      : await supabase.from("categories").insert([formData]);

    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message,
      });
    } else {
      toast({
        title: t("common.success"),
        description: category ? t("categories.updated") : t("categories.created"),
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const parentCategories = categories.filter((cat) => !cat.parent_id && cat.id !== category?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{category ? t("categories.edit") : t("categories.add")}</DialogTitle>
          <DialogDescription>
            {category
              ? t("categories.editDesc")
              : t("categories.addDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title_en">{t("common.titleEn")}</Label>
            <Input
              id="title_en"
              dir="ltr"
              value={formData.title_en}
              onChange={(e) =>
                setFormData({ ...formData, title_en: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title_ar">{t("common.titleAr")}</Label>
            <Input
              id="title_ar"
              dir="rtl"
              value={formData.title_ar}
              onChange={(e) =>
                setFormData({ ...formData, title_ar: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title_fr">{t("common.titleFr")}</Label>
            <Input
              id="title_fr"
              dir="ltr"
              value={formData.title_fr}
              onChange={(e) =>
                setFormData({ ...formData, title_fr: e.target.value })
              }
              required
            />
          </div>
          {!hasSubcategories && (
            <div className="space-y-2">
              <Label htmlFor="parent_id">{t("categories.parentOptional")}</Label>
              <Select
                value={formData.parent_id?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parent_id: value === "none" ? null : parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("categories.selectParent")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("categories.noneMain")}</SelectItem>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {localizedField(cat, "title", lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.saving") : category ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
