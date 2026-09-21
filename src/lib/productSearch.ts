/** The subset of a product that search looks at. */
export interface SearchableProduct {
  code: string;
  title_en: string;
  title_ar: string;
  title_fr: string;
}

export const normalizeSearchQuery = (query: string) =>
  query.trim().toLowerCase();

/**
 * Case-insensitive substring match against the product code and every
 * localized title. An empty query matches everything.
 */
export const matchesProductSearch = (
  product: SearchableProduct,
  query: string
): boolean => {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  return [product.code, product.title_en, product.title_ar, product.title_fr].some(
    (field) => (field ?? "").toLowerCase().includes(q)
  );
};

export const filterProductsBySearch = <T extends SearchableProduct>(
  products: T[],
  query: string
): T[] => {
  if (!normalizeSearchQuery(query)) return products;
  return products.filter((p) => matchesProductSearch(p, query));
};
