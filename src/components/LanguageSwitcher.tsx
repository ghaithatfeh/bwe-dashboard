import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { lang } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      aria-label={t("language.label")}
      onClick={() => i18n.changeLanguage(lang === "ar" ? "en" : "ar")}
    >
      <Languages className="h-4 w-4 me-2" />
      <span lang={lang === "ar" ? "en" : "ar"}>{t("language.switchTo")}</span>
    </Button>
  );
}
