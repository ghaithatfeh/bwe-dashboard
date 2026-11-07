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
import type { Json } from "@/integrations/supabase/types";
import { Category } from "@/pages/Categories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Upload, Trash2, Star, Image as ImageIcon } from "lucide-react";
import {
  COLORFUL_COLOR,
  TRANSPARENT_COLOR,
  getColorSwatchStyle,
  normalizeColors,
  SENTINEL_COLOR_NAMES,
  type ProductColor,
  type ProductColorNames,
} from "@/lib/colors";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/i18n";
import { localizedField } from "@/lib/localized";

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
  const { t } = useTranslation();
  const { lang } = useLanguage();
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
    price: null as number | null,
    quantity_bag: 0,
    quantity_box: 0,
    colors: [] as ProductColor[],
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
        price: product.price,
        quantity_bag: product.quantity_bag,
        quantity_box: product.quantity_box,
        colors: normalizeColors(product.colors),
        additional_colors: product.additional_colors ?? 0,
        is_featured: product.is_featured ?? false,
        top_products: product.top_products ?? false,
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
        price: null,
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
            title: t("products.images.invalidFile"),
            description: t("products.images.notImage", { name: file.name }),
          });
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: t("products.images.tooLarge"),
            description: t("products.images.exceedsLimit", { name: file.name }),
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
            title: t("products.images.uploadFailed"),
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
        title: t("common.success"),
        description: t("products.images.uploaded", { count: uploadedUrls.length }),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("products.images.uploadFailed"),
        description: t("products.images.uploadError"),
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
        title: t("common.success"),
        description: t("products.images.deleted"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("products.images.deleteFailed"),
      });
    }
  };

  const handleSetPrimary = (imageUrl: string) => {
    setPrimaryImage(imageUrl);
    toast({
      title: t("products.images.primarySet"),
      description: t("products.images.primarySetDesc"),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const productData = {
      ...formData,
      colors: formData.colors as unknown as Json,
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
        title: t("common.error"),
        description: error.message,
      });
    } else {
      toast({
        title: t("common.success"),
        description: product ? t("products.updated") : t("products.created"),
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const hasColor = (value: string) =>
    formData.colors.some((c) => c.value === value);

  const addColorValue = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || hasColor(normalized)) return;
    const names: ProductColorNames = SENTINEL_COLOR_NAMES[normalized] ?? {
      name_en: "",
      name_ar: "",
      name_fr: "",
    };
    setFormData({
      ...formData,
      colors: [...formData.colors, { value: normalized, ...names }],
    });
  };

  const addColor = () => {
    addColorValue(colorInput);
    setColorInput("");
  };

  const addTransparentColor = () => addColorValue(TRANSPARENT_COLOR);
  const addColorfulColor = () => addColorValue(COLORFUL_COLOR);

  const updateColorName = (
    value: string,
    field: keyof ProductColorNames,
    name: string
  ) => {
    setFormData({
      ...formData,
      colors: formData.colors.map((c) =>
        c.value === value ? { ...c, [field]: name } : c
      ),
    });
  };

  const removeColor = (value: string) => {
    setFormData({
      ...formData,
      colors: formData.colors.filter((c) => c.value !== value),
    });
  };

  const subcategories = categories.filter((cat) => cat.parent_id !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{product ? t("products.edit") : t("products.add")}</DialogTitle>
          <DialogDescription>
            {product ? t("products.editDesc") : t("products.addDesc")}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-4 pe-4">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">{t("products.tabs.basic")}</TabsTrigger>
                <TabsTrigger value="specs">{t("products.tabs.specs")}</TabsTrigger>
                <TabsTrigger value="images">{t("products.tabs.images")}</TabsTrigger>
                <TabsTrigger value="additional">{t("products.tabs.additional")}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">{t("products.form.code")}</Label>
                  <Input
                    id="code"
                    dir="ltr"
                    className="rtl:text-right"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id">{t("products.form.category")}</Label>
                  <Select
                    value={formData.category_id.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category_id: parseInt(value) })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("products.form.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {localizedField(cat, "title", lang)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
              </TabsContent>

              <TabsContent value="specs" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="material_en">{t("products.form.materialEn")}</Label>
                  <Input
                    id="material_en"
                    dir="ltr"
                    value={formData.material_en}
                    onChange={(e) =>
                      setFormData({ ...formData, material_en: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material_ar">{t("products.form.materialAr")}</Label>
                  <Input
                    id="material_ar"
                    dir="rtl"
                    value={formData.material_ar}
                    onChange={(e) =>
                      setFormData({ ...formData, material_ar: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material_fr">{t("products.form.materialFr")}</Label>
                  <Input
                    id="material_fr"
                    dir="ltr"
                    value={formData.material_fr}
                    onChange={(e) =>
                      setFormData({ ...formData, material_fr: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="length">{t("products.form.length")}</Label>
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
                    <Label htmlFor="weight">{t("products.form.weight")}</Label>
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
                    <Label htmlFor="diameter">{t("products.form.diameter")}</Label>
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
                    <Label htmlFor="quantity_bag">{t("products.form.quantityBag")}</Label>
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
                    <Label htmlFor="quantity_box">{t("products.form.quantityBox")}</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="price">{t("products.form.price")}</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("products.form.pricePlaceholder")}
                    value={formData.price ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                  />
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
                          {uploading ? t("products.images.uploading") : t("products.images.dropHint")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("products.images.formats")}
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
                              alt={t("products.images.alt", { index: index + 1 })}
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
                              <div className="absolute top-2 start-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                {t("products.images.primary")}
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
                      <p className="text-sm">{t("products.images.none")}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("products.form.colors")}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("products.form.colorPlaceholder")}
                      dir="ltr"
                      className="rtl:text-right"
                      value={colorInput}
                      onChange={(e) => setColorInput(e.target.value)}
                    />
                    <Button type="button" onClick={addColor}>
                      {t("common.add")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTransparentColor}
                      disabled={hasColor(TRANSPARENT_COLOR)}
                    >
                      {t("products.form.transparent")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addColorfulColor}
                      disabled={hasColor(COLORFUL_COLOR)}
                    >
                      {t("products.form.colorful")}
                    </Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {formData.colors.map((color) => (
                      <div
                        key={color.value}
                        className="flex flex-wrap items-center gap-2 bg-secondary px-3 py-2 rounded-md"
                      >
                        <div className="flex items-center gap-2 w-36 shrink-0">
                          <div
                            className="w-5 h-5 rounded-full border shrink-0"
                            style={getColorSwatchStyle(color.value)}
                          />
                          <span className="text-sm font-mono truncate" dir="ltr">
                            {color.value}
                          </span>
                        </div>
                        <Input
                          className="flex-1 min-w-[8rem]"
                          dir="ltr"
                          placeholder={t("products.form.colorNameEn")}
                          value={color.name_en}
                          onChange={(e) =>
                            updateColorName(color.value, "name_en", e.target.value)
                          }
                        />
                        <Input
                          className="flex-1 min-w-[8rem]"
                          dir="rtl"
                          placeholder="الاسم (AR)"
                          value={color.name_ar}
                          onChange={(e) =>
                            updateColorName(color.value, "name_ar", e.target.value)
                          }
                        />
                        <Input
                          className="flex-1 min-w-[8rem]"
                          dir="ltr"
                          placeholder={t("products.form.colorNameFr")}
                          value={color.name_fr}
                          onChange={(e) =>
                            updateColorName(color.value, "name_fr", e.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeColor(color.value)}
                          className="text-destructive hover:text-destructive/80 px-1"
                          aria-label={t("products.form.removeColor", { color: color.value })}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_colors">{t("products.form.additionalColors")}</Label>
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
                  <Label htmlFor="is_featured">{t("products.form.isFeatured")}</Label>
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_featured: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="top_products">{t("products.form.topProduct")}</Label>
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
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t("common.saving") : product ? t("common.update") : t("common.create")}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}