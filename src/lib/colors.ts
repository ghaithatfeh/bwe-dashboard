import type { CSSProperties } from "react";

/** Sentinel value stored in `products.colors` for a transparent / clear option. */
export const TRANSPARENT_COLOR = "transparent";

/** Sentinel value stored in `products.colors` for a multi-color / rainbow option. */
export const COLORFUL_COLOR = "colorful";

export const isTransparentColor = (color: string) =>
  color.trim().toLowerCase() === TRANSPARENT_COLOR;

export const isColorfulColor = (color: string) =>
  color.trim().toLowerCase() === COLORFUL_COLOR;

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
