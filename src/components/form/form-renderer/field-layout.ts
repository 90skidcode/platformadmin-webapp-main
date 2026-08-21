export type ColumnCount = 1 | 2 | 3;

export const COLUMNS_CLASS: Record<ColumnCount, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

export const COL_SPAN_CLASS: Record<ColumnCount, string> = {
  1: "",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
};
