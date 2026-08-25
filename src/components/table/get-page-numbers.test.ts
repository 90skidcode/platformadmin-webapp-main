import { describe, expect, it } from "vitest";

import { ELLIPSIS, getPageNumbers } from "./get-page-numbers";

describe("getPageNumbers", () => {
  it("lists every page when the total fits without truncation", () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows a trailing ellipsis when the current page is near the start", () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, ELLIPSIS, 10]);
    expect(getPageNumbers(2, 10)).toEqual([1, 2, 3, ELLIPSIS, 10]);
  });

  it("shows a leading ellipsis when the current page is near the end", () => {
    expect(getPageNumbers(10, 10)).toEqual([1, ELLIPSIS, 9, 10]);
    expect(getPageNumbers(9, 10)).toEqual([1, ELLIPSIS, 8, 9, 10]);
  });

  it("shows both ellipses when the current page is in the middle", () => {
    expect(getPageNumbers(5, 10)).toEqual([1, ELLIPSIS, 4, 5, 6, ELLIPSIS, 10]);
  });

  it("always includes exactly one page for a single-page table", () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
  });
});
