import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Category } from "@/pages/Categories";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/i18n";
import { localizedField } from "@/lib/localized";

interface CategoriesTableProps {
  /** Rows to render (may be a single page). */
  categories: Category[];
  /** Full list, used to resolve parent names; defaults to `categories`. */
  allCategories?: Category[];
  loading: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
}

export function CategoriesTable({
  categories,
  allCategories = categories,
  loading,
  onEdit,
  onDelete,
}: CategoriesTableProps) {
  const { t } = useTranslation();
  const { lang } = useLanguage();

  if (loading) {
    return <div className="text-center py-8">{t("categories.loading")}</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("categories.empty")}
      </div>
    );
  }

  const getCategoryName = (id: number | null) => {
    if (!id) return null;
    const category = allCategories.find((c) => c.id === id);
    return localizedField(category, "title", lang);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("common.id")}</TableHead>
            <TableHead>{t("categories.englishTitle")}</TableHead>
            <TableHead>{t("categories.arabicTitle")}</TableHead>
            <TableHead>{t("categories.frenchTitle")}</TableHead>
            <TableHead>{t("categories.type")}</TableHead>
            <TableHead>{t("categories.parent")}</TableHead>
            <TableHead className="text-end">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.id}</TableCell>
              <TableCell dir="ltr" className="rtl:text-right">{category.title_en}</TableCell>
              <TableCell dir="rtl" className="font-arabic ltr:text-left">{category.title_ar}</TableCell>
              <TableCell dir="ltr" className="rtl:text-right">{category.title_fr}</TableCell>
              <TableCell>
                {category.parent_id ? (
                  <Badge variant="secondary">{t("categories.subcategory")}</Badge>
                ) : (
                  <Badge>{t("categories.mainCategory")}</Badge>
                )}
              </TableCell>
              <TableCell>
                {category.parent_id ? getCategoryName(category.parent_id) : "-"}
              </TableCell>
              <TableCell className="text-end">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
