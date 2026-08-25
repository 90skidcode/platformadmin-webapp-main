export const ELLIPSIS = "ellipsis" as const;

export type PageNumberItem = number | typeof ELLIPSIS;

/**
 * Builds the compact "1 2 3 … 10" page list pagination controls render,
 * always keeping the first/last page and a window around the current one
 * visible so long tables don't spill dozens of page buttons.
 *
 * @param currentPage 1-based current page.
 * @param totalPages total number of pages (>= 1).
 * @param siblingCount how many pages to show on each side of the current one.
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
): PageNumberItem[] {
  // first page + last page + current page + 2*siblings + 2*ellipsis
  const totalVisible = siblingCount * 2 + 5;

  if (totalPages <= totalVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  const pages: PageNumberItem[] = [1];

  if (showLeftEllipsis) {
    pages.push(ELLIPSIS);
  } else {
    for (let page = 2; page < leftSibling; page++) pages.push(page);
  }

  for (
    let page = Math.max(leftSibling, 2);
    page <= Math.min(rightSibling, totalPages - 1);
    page++
  ) {
    pages.push(page);
  }

  if (showRightEllipsis) {
    pages.push(ELLIPSIS);
  } else {
    for (let page = rightSibling + 1; page < totalPages; page++)
      pages.push(page);
  }

  pages.push(totalPages);

  return pages;
}
