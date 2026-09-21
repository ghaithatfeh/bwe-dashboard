import { useEffect, useMemo, useState } from "react";

export const DOTS = "dots" as const;

type PageItem = number | typeof DOTS;

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

/**
 * Builds the page list with ellipsis, e.g. [1, "dots", 4, 5, 6, "dots", 12]
 */
const buildPageRange = (
  currentPage: number,
  totalPages: number,
  siblings: number,
): PageItem[] => {
  // first + last + current + 2 dots + siblings on both sides
  const totalSlots = siblings * 2 + 5;

  if (totalSlots >= totalPages) return range(1, totalPages);

  const leftSibling = Math.max(currentPage - siblings, 1);
  const rightSibling = Math.min(currentPage + siblings, totalPages);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  if (!showLeftDots && showRightDots) {
    return [...range(1, siblings * 2 + 3), DOTS, totalPages];
  }

  if (showLeftDots && !showRightDots) {
    return [1, DOTS, ...range(totalPages - (siblings * 2 + 2), totalPages)];
  }

  return [1, DOTS, ...range(leftSibling, rightSibling), DOTS, totalPages];
};

interface UsePaginationOptions<T> {
  items: T[];
  pageSize: number;
  /** Pages shown on each side of the current page */
  siblings?: number;
  /** Changing any of these values sends the user back to page 1 */
  resetKey?: unknown;
}

export const usePagination = <T>({
  items,
  pageSize,
  siblings = 1,
  resetKey,
}: UsePaginationOptions<T>) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [resetKey]);

  // Keep the page in bounds when the list shrinks
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const pageRange = useMemo(
    () => buildPageRange(safePage, totalPages, siblings),
    [safePage, totalPages, siblings],
  );

  const goToPage = (page: number) =>
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));

  return {
    currentPage: safePage,
    totalPages,
    totalItems,
    paginatedItems,
    pageRange,
    goToPage,
    nextPage: () => goToPage(safePage + 1),
    previousPage: () => goToPage(safePage - 1),
    firstItemIndex: totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1,
    lastItemIndex: Math.min(safePage * pageSize, totalItems),
  };
};
