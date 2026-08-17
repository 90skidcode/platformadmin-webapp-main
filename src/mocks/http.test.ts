import { describe, expect, it } from "vitest";

import { paginate, parsePageParams, type PageParams } from "./http";

describe("parsePageParams", () => {
  it("defaults page to 1 and pageSize to 10", () => {
    const params = parsePageParams(new URL("http://localhost/x"));
    expect(params).toMatchObject({
      page: 1,
      pageSize: 10,
      search: "",
      sortDir: "asc",
    });
  });

  it("reads page, pageSize, search, sortBy, sortDir from query params", () => {
    const params = parsePageParams(
      new URL(
        "http://localhost/x?page=3&pageSize=25&search=Kavya&sortBy=name&sortDir=desc",
      ),
    );
    expect(params).toEqual({
      page: 3,
      pageSize: 25,
      search: "kavya",
      sortBy: "name",
      sortDir: "desc",
    });
  });

  it("clamps page below 1 up to 1, ignoring garbage input", () => {
    expect(parsePageParams(new URL("http://localhost/x?page=0")).page).toBe(1);
    expect(parsePageParams(new URL("http://localhost/x?page=-5")).page).toBe(1);
    expect(
      parsePageParams(new URL("http://localhost/x?page=notanumber")).page,
    ).toBe(1);
  });

  it("clamps pageSize to the [1, 100] range", () => {
    // pageSize=0 is falsy, so it falls back to the "missing" default (10),
    // same as omitting the param entirely -- not clamped up to 1.
    expect(
      parsePageParams(new URL("http://localhost/x?pageSize=0")).pageSize,
    ).toBe(10);
    expect(
      parsePageParams(new URL("http://localhost/x?pageSize=500")).pageSize,
    ).toBe(100);
  });

  it("falls back to defaultSortBy when sortBy isn't given", () => {
    expect(parsePageParams(new URL("http://localhost/x"), "name").sortBy).toBe(
      "name",
    );
  });
});

describe("paginate", () => {
  const items = [
    { id: "1", name: "Kavya Iyer", email: "kavya@acme.example" },
    { id: "2", name: "Rahul Verma", email: "rahul@acme.example" },
    { id: "3", name: "Meera Krishnan", email: "meera@acme.example" },
  ];
  const baseParams: PageParams = {
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: null,
    sortDir: "asc",
  };

  it("returns everything, unsorted, when there's no search/sort", () => {
    const result = paginate(items, baseParams, ["name", "email"]);
    expect(result).toEqual({ data: items, page: 1, pageSize: 10, total: 3 });
  });

  it("filters by a case-insensitive substring match across the given fields", () => {
    const result = paginate(items, { ...baseParams, search: "rahul" }, [
      "name",
      "email",
    ]);
    expect(result.data).toEqual([items[1]]);
    expect(result.total).toBe(1);
  });

  it("sorts ascending and descending by the given field", () => {
    const asc = paginate(items, { ...baseParams, sortBy: "name" }, ["name"]);
    expect(asc.data.map((i) => i.name)).toEqual([
      "Kavya Iyer",
      "Meera Krishnan",
      "Rahul Verma",
    ]);

    const desc = paginate(
      items,
      { ...baseParams, sortBy: "name", sortDir: "desc" },
      ["name"],
    );
    expect(desc.data.map((i) => i.name)).toEqual([
      "Rahul Verma",
      "Meera Krishnan",
      "Kavya Iyer",
    ]);
  });

  it("slices to the requested page/pageSize and reports the pre-slice total", () => {
    const result = paginate(items, { ...baseParams, page: 2, pageSize: 1 }, [
      "name",
    ]);
    expect(result.data).toEqual([items[1]]);
    expect(result.total).toBe(3);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(1);
  });

  it("returns an empty page past the end of the data, without throwing", () => {
    const result = paginate(items, { ...baseParams, page: 99, pageSize: 10 }, [
      "name",
    ]);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(3);
  });
});
