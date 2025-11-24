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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title_en: "",
    title_ar: "",
    title_fr: "",
    parent_id: null as number | null,
  });

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
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: `Category ${category ? "updated" : "created"} successfully`,
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
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
          <DialogDescription>
            {category
              ? "Update the category information below"
              : "Add a new category or subcategory"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title_en">Title (English)</Label>
            <Input
              id="title_en"
              value={formData.title_en}
              onChange={(e) =>
                setFormData({ ...formData, title_en: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title_ar">Title (Arabic)</Label>
            <Input
              id="title_ar"
              value={formData.title_ar}
              onChange={(e) =>
                setFormData({ ...formData, title_ar: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title_fr">Title (French)</Label>
            <Input
              id="title_fr"
              value={formData.title_fr}
              onChange={(e) =>
                setFormData({ ...formData, title_fr: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent_id">Parent Category (Optional)</Label>
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
                <SelectValue placeholder="Select parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Main Category)</SelectItem>
                {parentCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.title_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : category ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
