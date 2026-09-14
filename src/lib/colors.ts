import type { CSSProperties } from "react";

/** Sentinel value stored in `products.colors` for a transparent / clear option. */
export const TRANSPARENT_COLOR = "transparent";

export const isTransparentColor = (color: string) =>
  color.trim().toLowerCase() === TRANSPARENT_COLOR;

/**
 * Inline style for a color swatch. Transparent renders as a checkerboard
 * so it stays visible instead of disappearing into the background.
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
  return { backgroundColor: color };
};
