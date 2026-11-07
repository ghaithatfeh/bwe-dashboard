type LocalizedField = "title" | "material";
type ContentLanguage = "en" | "ar" | "fr";

type Localizable<F extends LocalizedField> = {
  [K in `${F}_${ContentLanguage}`]?: string | null;
};

/**
 * Returns `item[`${field}_${lang}`]`, falling back to the English value when
 * the translation is missing or empty.
 */
export const localizedField = <F extends LocalizedField>(
  item: Localizable<F> | null | undefined,
  field: F,
  lang: ContentLanguage,
): string => {
  if (!item) return "";
  return item[`${field}_${lang}`] || item[`${field}_en`] || "";
};
