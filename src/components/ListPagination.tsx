import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOTS } from "@/hooks/usePagination";
import { useTranslation } from "react-i18next";

interface ListPaginationProps {
  /** Translated plural noun for the summary line, e.g. "products". */
  itemLabel: string;
  currentPage: number;
  totalPages: number;
  pageRange: (number | typeof DOTS)[];
  firstItemIndex: number;
  lastItemIndex: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function ListPagination({
  itemLabel,
  currentPage,
  totalPages,
  pageRange,
  firstItemIndex,
  lastItemIndex,
  totalItems,
  onPageChange,
}: ListPaginationProps) {
  const { t } = useTranslation();

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {t("pagination.showing", { from: firstItemIndex, to: lastItemIndex, total: totalItems, label: itemLabel })}
      </p>

      {totalPages > 1 && (
        <nav
          aria-label={t("pagination.label", { label: itemLabel })}
          className="flex items-center gap-1"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label={t("pagination.previousPage")}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{t("pagination.previous")}</span>
          </Button>

          {pageRange.map((item, index) =>
            item === DOTS ? (
              <span
                key={`dots-${index}`}
                aria-hidden
                className="flex h-9 w-9 items-center justify-center text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                variant={item === currentPage ? "outline" : "ghost"}
                size="icon"
                onClick={() => onPageChange(item)}
                aria-current={item === currentPage ? "page" : undefined}
                aria-label={t("pagination.page", { page: item })}
              >
                {item}
              </Button>
            ),
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label={t("pagination.nextPage")}
          >
            <span className="hidden sm:inline">{t("pagination.next")}</span>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </nav>
      )}
    </div>
  );
}
