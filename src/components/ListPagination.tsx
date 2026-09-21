import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOTS } from "@/hooks/usePagination";

interface ListPaginationProps {
  /** Plural noun for the summary line, e.g. "products". */
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
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {firstItemIndex}-{lastItemIndex} of {totalItems} {itemLabel}
      </p>

      {totalPages > 1 && (
        <nav
          aria-label={`${itemLabel} pagination`}
          className="flex items-center gap-1"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
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
                aria-label={`Go to page ${item}`}
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
            aria-label="Go to next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
