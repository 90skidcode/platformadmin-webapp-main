import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/test/test-utils";
import { TablePagination } from "./table-pagination";

const messages = {
  common: {
    table: {
      page: "Page {page} of {totalPages}",
      pagination: "Pagination",
      previousPage: "Previous",
      nextPage: "Next",
      goToPage: "Go to page {page}",
      morePages: "More pages",
    },
  },
};

function renderPagination(
  props: Partial<React.ComponentProps<typeof TablePagination>> = {},
) {
  const onPageChange = vi.fn();
  renderWithProviders(
    <TablePagination
      pageIndex={0}
      pageSize={10}
      total={100}
      onPageChange={onPageChange}
      {...props}
    />,
    { messages },
  );
  return { onPageChange };
}

describe("TablePagination", () => {
  it("renders a numbered button for every page when they all fit", () => {
    renderPagination({ total: 30, pageSize: 10 });
    expect(
      screen.getByRole("button", { name: "Go to page 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to page 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to page 3" }),
    ).toBeInTheDocument();
  });

  it("collapses distant pages behind an ellipsis, keeping first/last and a window around current", () => {
    renderPagination({ pageIndex: 0, total: 100, pageSize: 10 });
    expect(
      screen.getByRole("button", { name: "Go to page 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to page 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to page 10" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Go to page 5" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("More pages")).toBeInTheDocument();
  });

  it("marks the current page with aria-current", () => {
    renderPagination({ pageIndex: 1, total: 30, pageSize: 10 });
    expect(
      screen.getByRole("button", { name: "Go to page 2" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("button", { name: "Go to page 1" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("calls onPageChange with a 0-based index when a page number is clicked", async () => {
    const { onPageChange } = renderPagination({ total: 30, pageSize: 10 });
    await userEvent.click(screen.getByRole("button", { name: "Go to page 3" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables Previous on the first page and Next on the last page", () => {
    renderPagination({ pageIndex: 0, total: 30, pageSize: 10 });
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();

    renderPagination({ pageIndex: 2, total: 30, pageSize: 10 });
    expect(
      screen.getAllByRole("button", { name: "Previous" })[1],
    ).not.toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Next" })[1]).toBeDisabled();
  });
});
