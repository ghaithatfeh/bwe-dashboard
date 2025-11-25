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

interface ProductsTableProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

export function ProductsTable({
  products,
  categories,
  loading,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No products found. Create your first product to get started.
      </div>
    );
  }

  const getCategoryName = (id: number) => {
    const category = categories.find((c) => c.id === id);
    return category?.title_en || "Unknown";
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Title (EN)</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Material</TableHead>
            <TableHead>Qty/Bag</TableHead>
            <TableHead>Qty/Box</TableHead>
            <TableHead>Featured</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                {product.primary_image_url ? (
                  <img
                    src={product.primary_image_url}
                    alt={product.title_en}
                    className="w-10 h-10 object-cover rounded border border-border"
                  />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded border border-border flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{product.code}</TableCell>
              <TableCell>{product.title_en}</TableCell>
              <TableCell>
                <Badge variant="secondary">{getCategoryName(product.category_id)}</Badge>
              </TableCell>
              <TableCell>{product.material_en}</TableCell>
              <TableCell>{product.quantity_bag}</TableCell>
              <TableCell>{product.quantity_box}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {product.is_featured && (
                    <Badge className="bg-yellow-500">
                      <Star className="h-3 w-3" />
                    </Badge>
                  )}
                  {product.top_products && (
                    <Badge className="bg-green-500">Top</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
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
