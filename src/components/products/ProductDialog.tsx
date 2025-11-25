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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/pages/Products";
import { Category } from "@/pages/Categories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Upload, Trash2, Star, Image as ImageIcon } from "lucide-react";

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  onSuccess: () => void;
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSuccess,
}: ProductDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    category_id: 0,
    title_en: "",
    title_ar: "",
    title_fr: "",
    material_en: "",
    material_ar: "",
    material_fr: "",
    length: null as number | null,
    weight: null as number | null,
    diameter: null as number | null,
    quantity_bag: 0,
    quantity_box: 0,
    colors: [] as string[],
    additional_colors: 0,
    is_featured: false,
    top_products: false,
  });
  const [colorInput, setColorInput] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        code: product.code,
        category_id: product.category_id,
        title_en: product.title_en,
        title_ar: product.title_ar,
        title_fr: product.title_fr,
        material_en: product.material_en,
        material_ar: product.material_ar,
        material_fr: product.material_fr,
        length: product.length,
        weight: product.weight,
        diameter: product.diameter,
        quantity_bag: product.quantity_bag,
        quantity_box: product.quantity_box,
        colors: product.colors,
        additional_colors: product.additional_colors,
        is_featured: product.is_featured,
        top_products: product.top_products,
      });
      setImages(product.images || []);
      setPrimaryImage(product.primary_image_url);
    } else {
      setFormData({
        code: "",
        category_id: 0,
        title_en: "",
        title_ar: "",
        title_fr: "",
        material_en: "",
        material_ar: "",
        material_fr: "",
        length: null,
        weight: null,
        diameter: null,
        quantity_bag: 0,
        quantity_box: 0,
        colors: [],
        additional_colors: 0,
        is_featured: false,
        top_products: false,
      });
      setImages([]);
      setPrimaryImage(null);
    }
  }, [product]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast({
            variant: "destructive",
            title: "Invalid file",
            description: `${file.name} is not an image file`,
          });
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: "File too large",
            description: `${file.name} exceeds 5MB limit`,
          });
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${formData.code || "temp"}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, file);

        if (uploadError) {
          toast({
            variant: "destructive",
            title: "Upload failed",
            description: uploadError.message,
          });
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);

      if (!primaryImage && uploadedUrls.length > 0) {
        setPrimaryImage(uploadedUrls[0]);
      }

      toast({
        title: "Success",
        description: `${uploadedUrls.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "An error occurred during upload",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFiles(e.target.files);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    try {
      const fileName = imageUrl.split("/").pop();
      if (fileName) {
        await supabase.storage.from("product-images").remove([fileName]);
      }

      const newImages = images.filter((img) => img !== imageUrl);
      setImages(newImages);

      if (primaryImage === imageUrl) {
        setPrimaryImage(newImages.length > 0 ? newImages[0] : null);
      }

      toast({
        title: "Success",
        description: "Image deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete image",
      });
    }
  };

  const handleSetPrimary = (imageUrl: string) => {
    setPrimaryImage(imageUrl);
    toast({
      title: "Primary image set",
      description: "This image is now the primary product image",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const productData = {
      ...formData,
      images,
      primary_image_url: primaryImage,
    };

    const { error } = product
      ? await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id)
      : await supabase.from("products").insert([productData]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: `Product ${product ? "updated" : "created"} successfully`,
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const addColor = () => {
    if (colorInput && !formData.colors.includes(colorInput)) {
      setFormData({ ...formData, colors: [...formData.colors, colorInput] });
      setColorInput("");
    }
  };

  const removeColor = (color: string) => {
    setFormData({
      ...formData,
      colors: formData.colors.filter((c) => c !== color),
    });
  };

  const subcategories = categories.filter((cat) => cat.parent_id !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            {product ? "Update product information" : "Add a new product to your catalog"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-4 pr-4">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="specs">Specifications</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="additional">Additional</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Product Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id">Category (Subcategory only)</Label>
                  <Select
                    value={formData.category_id.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category_id: parseInt(value) })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.title_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
              </TabsContent>

              <TabsContent value="specs" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="material_en">Material (English)</Label>
                  <Input
                    id="material_en"
                    value={formData.material_en}
                    onChange={(e) =>
                      setFormData({ ...formData, material_en: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material_ar">Material (Arabic)</Label>
                  <Input
                    id="material_ar"
                    value={formData.material_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, material_ar: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material_fr">Material (French)</Label>
                  <Input
                    id="material_fr"
                    value={formData.material_fr}
                    onChange={(e) =>
                      setFormData({ ...formData, material_fr: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="length">Length (mm)</Label>
                    <Input
                      id="length"
                      type="number"
                      step="0.01"
                      value={formData.length || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          length: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (g)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.01"
                      value={formData.weight || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          weight: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="diameter">Diameter (mm)</Label>
                    <Input
                      id="diameter"
                      type="number"
                      step="0.01"
                      value={formData.diameter || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          diameter: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity_bag">Quantity per Bag (pcs)</Label>
                    <Input
                      id="quantity_bag"
                      type="number"
                      value={formData.quantity_bag}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity_bag: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity_box">Quantity per Box (pcs)</Label>
                    <Input
                      id="quantity_box"
                      type="number"
                      value={formData.quantity_box}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity_box: parseInt(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-4">
                <div className="space-y-4">
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive 
                        ? "border-primary bg-primary/5" 
                        : "border-border"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      id="image-upload"
                      className="hidden"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {uploading ? "Uploading..." : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WEBP up to 5MB
                        </p>
                      </div>
                    </label>
                  </div>

                  {images.length > 0 && (
                    <ScrollArea className={images.length > 3 ? "h-[250px]" : ""} >
                      <div className="grid grid-cols-3 gap-4">
                        {images.map((imageUrl, index) => (
                          <Card key={index} className="relative group overflow-hidden">
                            <img
                              src={imageUrl}
                              alt={`Product ${index + 1}`}
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                size="icon"
                                type="button"
                                variant={primaryImage === imageUrl ? "default" : "secondary"}
                                onClick={() => handleSetPrimary(imageUrl)}
                              >
                                <Star className={primaryImage === imageUrl ? "fill-current" : ""} />
                              </Button>
                              <Button
                                size="icon"
                                type="button"
                                variant="destructive"
                                onClick={() => handleDeleteImage(imageUrl)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {primaryImage === imageUrl && (
                              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                Primary
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {images.length === 0 && (
                    <div className="text-center pt-6 text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No images uploaded yet</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4">
                <div className="space-y-2">
                  <Label>Available Colors</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter color hex code (e.g., #ff0000)"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                    />
                    <Button type="button" onClick={addColor}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.colors.map((color) => (
                      <div
                        key={color}
                        className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-md"
                      >
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm">{color}</span>
                        <button
                          type="button"
                          onClick={() => removeColor(color)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_colors">Additional Colors</Label>
                  <Input
                    id="additional_colors"
                    type="number"
                    value={formData.additional_colors}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        additional_colors: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_featured">Featured Product</Label>
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_featured: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="top_products">Top Product</Label>
                  <Switch
                    id="top_products"
                    checked={formData.top_products}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, top_products: checked })
                    }
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : product ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}