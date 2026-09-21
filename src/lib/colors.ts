import type { CSSProperties } from "react";

/** Sentinel value stored in a product color for a transparent / clear option. */
export const TRANSPARENT_COLOR = "transparent";

/** Sentinel value stored in a product color for a multi-color / rainbow option. */
export const COLORFUL_COLOR = "colorful";

/** One entry of `products.colors` (jsonb array). */
export interface ProductColor {
  /** Lowercase hex code (e.g. "#ff0000") or a sentinel such as "transparent". */
  value: string;
  name_en: string;
  name_ar: string;
  name_fr: string;
}

export type ProductColorNames = Omit<ProductColor, "value">;

const EMPTY_NAMES: ProductColorNames = { name_en: "", name_ar: "", name_fr: "" };

/** Prefilled names used when a sentinel color is added from the dashboard. */
export const SENTINEL_COLOR_NAMES: Record<string, ProductColorNames> = {
  [TRANSPARENT_COLOR]: { name_en: "Transparent", name_ar: "شفاف", name_fr: "Transparent" },
  [COLORFUL_COLOR]: { name_en: "Colorful", name_ar: "ملون", name_fr: "Multicolore" },
};

export const isTransparentColor = (color: string) =>
  color.trim().toLowerCase() === TRANSPARENT_COLOR;

export const isColorfulColor = (color: string) =>
  color.trim().toLowerCase() === COLORFUL_COLOR;

/**
 * Accepts either the legacy `string[]` shape or the current array of
 * `ProductColor` objects (or null/undefined) and always returns a clean
 * `ProductColor[]`. Unknown entries are dropped.
 */
export const normalizeColors = (raw: unknown): ProductColor[] => {
  if (!Array.isArray(raw)) return [];
  const result: ProductColor[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      const value = entry.trim().toLowerCase();
      if (value) result.push({ value, ...(SENTINEL_COLOR_NAMES[value] ?? EMPTY_NAMES) });
    } else if (entry && typeof entry === "object" && typeof (entry as ProductColor).value === "string") {
      const e = entry as Partial<ProductColor>;
      const value = (e.value as string).trim().toLowerCase();
      if (!value) continue;
      result.push({
        value,
        name_en: typeof e.name_en === "string" ? e.name_en : "",
        name_ar: typeof e.name_ar === "string" ? e.name_ar : "",
        name_fr: typeof e.name_fr === "string" ? e.name_fr : "",
      });
    }
  }
  return result;
};

/** Localized display name, falling back to English and then to the raw value. */
export const getColorName = (color: ProductColor, locale: string): string => {
  const key = `name_${locale}` as keyof ProductColorNames;
  const localized = key in color ? color[key]?.trim() : "";
  return localized || color.name_en.trim() || color.value;
};

/**
 * Inline style for a color swatch. Transparent renders as a checkerboard
 * and colorful as a rainbow gradient so both stay recognizable.
 */
export const getColorSwatchStyle = (color: string): CSSProperties => {
  if (isTransparentColor(color)) {
    return {
      backgroundColor: "#ffffff",
      backgroundImage:
        "linear-gradient(45deg, #c7c7c7 25%, transparent 25%, transparent 75%, #c7c7c7 75%), linear-gradient(45deg, #c7c7c7 25%, transparent 25%, transparent 75%, #c7c7c7 75%)",
      backgroundSize: "8px 8px",
      backgroundPosition: "0 0, 4px 4px",
    };
  }
  if (isColorfulColor(color)) {
    return {
      backgroundImage:
        "conic-gradient(#ff0000, #ff9900, #ffee00, #33cc33, #0099ff, #6633cc, #ff0000)",
    };
  }
  return { backgroundColor: color };
};
