import { Edit, Trash2, Star, Image as ImageIcon } from "lucide-react";
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
import { Product } from "@/pages/Products";
import { Category } from "@/pages/Categories";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/i18n";
import { localizedField } from "@/lib/localized";

interface ProductsTableProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  /** Shown when the list is empty; defaults to the "create your first product" hint. */
  emptyMessage?: string;
}

export function ProductsTable({
  products,
  categories,
  loading,
  onEdit,
  onDelete,
  emptyMessage,
}: ProductsTableProps) {
  const { t } = useTranslation();
  const { lang } = useLanguage();

  if (loading) {
    return <div className="text-center py-8">{t("products.loading")}</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage ?? t("products.empty")}
      </div>
    );
  }

  const getCategoryName = (id: number) => {
    const category = categories.find((c) => c.id === id);
    return category ? localizedField(category, "title", lang) : t("products.unknown");
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("products.image")}</TableHead>
            <TableHead>{t("products.code")}</TableHead>
            <TableHead>{t("products.titleCol")}</TableHead>
            <TableHead>{t("products.category")}</TableHead>
            <TableHead>{t("products.material")}</TableHead>
            <TableHead>{t("products.qtyBag")}</TableHead>
            <TableHead>{t("products.qtyBox")}</TableHead>
            <TableHead>{t("products.price")}</TableHead>
            <TableHead>{t("products.featured")}</TableHead>
            <TableHead className="text-end">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                {product.primary_image_url ? (
                  <img
                    src={product.primary_image_url}
                    alt={localizedField(product, "title", lang)}
                    className="w-10 h-10 object-cover rounded border border-border"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded border border-border flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{product.code}</TableCell>
              <TableCell>{localizedField(product, "title", lang)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{getCategoryName(product.category_id)}</Badge>
              </TableCell>
              <TableCell>{localizedField(product, "material", lang)}</TableCell>
              <TableCell>{product.quantity_bag}</TableCell>
              <TableCell>{product.quantity_box}</TableCell>
              <TableCell>{product.price ?? "—"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {product.is_featured && (
                    <Badge className="bg-yellow-500">
                      <Star className="h-3 w-3" />
                    </Badge>
                  )}
                  {product.top_products && (
                    <Badge className="bg-green-500">{t("products.top")}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-end">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(product.id)}
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
