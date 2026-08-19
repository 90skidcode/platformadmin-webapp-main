import { describe, expect, it } from "vitest";

import { normalizeListBody, translateListSearchParams } from "./normalize-list";

describe("translateListSearchParams", () => {
  it("returns an empty string unchanged", () => {
    expect(translateListSearchParams("")).toBe("");
  });

  it("renames pageSize to limit", () => {
    expect(translateListSearchParams("?page=1&pageSize=20")).toBe(
      "?page=1&limit=20",
    );
  });

  it("leaves params without pageSize untouched", () => {
    expect(translateListSearchParams("?page=1&search=abc")).toBe(
      "?page=1&search=abc",
    );
  });
});

describe("normalizeListBody", () => {
  it("maps the backend's nested-list shape onto items/camelCase pagination", () => {
    const raw = JSON.stringify({
      code: "S_200_USR_LIST_OK",
      message: "Users fetched successfully",
      data: {
        data: [{ id: "1", name: "Sathish" }],
        pagination: { page: 1, limit: 20, total_items: 102, total_pages: 6 },
      },
    });

    const result = JSON.parse(normalizeListBody(raw));

    expect(result).toEqual({
      code: "S_200_USR_LIST_OK",
      message: "Users fetched successfully",
      data: {
        items: [{ id: "1", name: "Sathish" }],
        pagination: { page: 1, limit: 20, totalItems: 102, totalPages: 6 },
      },
    });
  });

  it("passes through a body that isn't the nested-list shape", () => {
    const raw = JSON.stringify({ data: { id: "1", name: "Sathish" } });
    expect(normalizeListBody(raw)).toBe(raw);
  });

  it("passes through non-JSON bodies without throwing", () => {
    expect(normalizeListBody("not json")).toBe("not json");
  });

  it("passes through an empty body without throwing", () => {
    expect(normalizeListBody("")).toBe("");
  });
});
