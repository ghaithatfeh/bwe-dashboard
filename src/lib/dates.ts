import { format } from "date-fns";
import { arMA, enUS } from "date-fns/locale";
import i18n from "@/i18n";

/** date-fns `format` in the current UI language (Moroccan Arabic or English). */
export const formatDate = (value: string | number | Date, pattern: string) =>
  format(new Date(value), pattern, { locale: i18n.language === "ar" ? arMA : enUS });
