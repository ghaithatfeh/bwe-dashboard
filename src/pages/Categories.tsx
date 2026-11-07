import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CategoryDialog } from "@/components/categories/CategoryDialog";
import { CategoriesTable } from "@/components/categories/CategoriesTable";
import { ListPagination } from "@/components/ListPagination";
import { usePagination } from "@/hooks/usePagination";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface Category {
  id: number;
  title_en: string;
  title_ar: string;
  title_fr: string;
  parent_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  categories?: Category[];
}

const CATEGORIES_PER_PAGE = 10;

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*, categories(*)")
      .order("id", { ascending: true });


    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("categories.fetchFailed"),
      });
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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
    items: categories,
    pageSize: CATEGORIES_PER_PAGE,
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("categories.confirmDelete"))) return;

    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("categories.deleteFailed"),
      });
    } else {
      toast({
        title: t("common.success"),
        description: t("categories.deleted"),
      });
      fetchCategories();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("categories.title")}</h2>
          <p className="text-muted-foreground">
            {t("categories.subtitle")}
          </p>
        </div>
        <Button onClick={() => {
          setEditingCategory(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 me-2" />
          {t("categories.add")}
        </Button>
      </div>

      <CategoriesTable
        categories={paginatedItems}
        allCategories={categories}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {!loading && (
        <ListPagination
          itemLabel={t("categories.itemLabel")}
          currentPage={currentPage}
          totalPages={totalPages}
          pageRange={pageRange}
          firstItemIndex={firstItemIndex}
          lastItemIndex={lastItemIndex}
          totalItems={totalItems}
          onPageChange={goToPage}
        />
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        categories={categories}
        onSuccess={fetchCategories}
      />
    </div>
  );
};

export default Categories;
