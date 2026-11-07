import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductDialog } from "@/components/products/ProductDialog";
import { ProductsTable } from "@/components/products/ProductsTable";
import { ListPagination } from "@/components/ListPagination";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/use-toast";
import { Category } from "./Categories";
import { normalizeColors, type ProductColor } from "@/lib/colors";
import { filterProductsBySearch } from "@/lib/productSearch";
import { useTranslation } from "react-i18next";

export interface Product {
  id: number;
  code: string;
  category_id: number;
  title_en: string;
  title_ar: string;
  title_fr: string;
  material_en: string;
  material_ar: string;
  material_fr: string;
  length: number | null;
  weight: number | null;
  diameter: number | null;
  price: number | null;
  quantity_bag: number;
  quantity_box: number;
  images: string[] | null;
  colors: ProductColor[] | null;
  additional_colors: number | null;
  is_featured: boolean | null;
  top_products: boolean | null;
  primary_image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const PRODUCTS_PER_PAGE = 10;

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchData = async () => {
    setLoading(true);
    const [productsResult, categoriesResult] = await Promise.all([
      supabase.from("products").select("*").order("id", { ascending: true }),
      supabase.from("categories").select("*").order("id", { ascending: true }),
    ]);

    if (productsResult.error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("products.fetchFailed"),
      });
    } else {
      setProducts(
        (productsResult.data || []).map((p) => ({
          ...p,
          colors: normalizeColors(p.colors),
        })),
      );
    }

    if (categoriesResult.error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("categories.fetchFailed"),
      });
    } else {
      setCategories(categoriesResult.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProducts = useMemo(
    () => filterProductsBySearch(products, searchQuery),
    [products, searchQuery],
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
    items: filteredProducts,
    pageSize: PRODUCTS_PER_PAGE,
    resetKey: searchQuery.trim().toLowerCase(),
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("products.confirmDelete"))) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("products.deleteFailed"),
      });
    } else {
      toast({
        title: t("common.success"),
        description: t("products.deleted"),
      });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("products.title")}</h2>
          <p className="text-muted-foreground">
            {t("products.subtitle")}
          </p>
        </div>
        <Button onClick={() => {
          setEditingProduct(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 me-2" />
          {t("products.add")}
        </Button>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t("products.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9 pe-9"
          aria-label={t("products.searchLabel")}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={t("common.clearSearch")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ProductsTable
        products={paginatedItems}
        categories={categories}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage={
          searchQuery ? t("products.noMatch", { query: searchQuery.trim() }) : undefined
        }
      />

      {!loading && (
        <ListPagination
          itemLabel={t("products.itemLabel")}
          currentPage={currentPage}
          totalPages={totalPages}
          pageRange={pageRange}
          firstItemIndex={firstItemIndex}
          lastItemIndex={lastItemIndex}
          totalItems={totalItems}
          onPageChange={goToPage}
        />
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        categories={categories}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default Products;
