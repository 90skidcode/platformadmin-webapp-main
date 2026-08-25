import { describe, expect, it, vi } from "vitest";

import enCommon from "@/messages/en/common.json";
import {
  failure,
  fieldErrorMessage,
  paginate,
  parsePageParams,
  success,
  toListData,
  type PageParams,
} from "./http";

// `success`/`failure` resolve `message` via `next-intl/server`'s
// `getTranslations`, keyed by the business code -- that's the behavior
// under test here (below), so stub it with the *real* en/common.json
// dictionary rather than a fake one: a test using a fabricated dictionary
// would keep passing even if the real `apiMessages`/`apiFieldErrors` keys
// drifted from what the routes actually pass in. `vi.mock` is hoisted
// above these imports by vitest's transform, same as jest.mock.
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => {
    const bucket =
      namespace === "common.apiMessages"
        ? enCommon.apiMessages
        : enCommon.apiFieldErrors;
    return (key: string) => (bucket as Record<string, string>)[key];
  },
}));

async function readBody(res: Response) {
  return res.json() as Promise<{
    code: string;
    message: string;
    data: unknown;
  }>;
}

describe("success/failure envelopes", () => {
  describe("success", () => {
    it("builds an S_-prefixed code, with message resolved from common.apiMessages by business code", async () => {
      const res = await success(201, "USR_CREATED", { id: "usr_1" });
      expect(res.status).toBe(201);
      await expect(readBody(res)).resolves.toEqual({
        code: "S_201_USR_CREATED",
        message: enCommon.apiMessages.USR_CREATED,
        data: { id: "usr_1" },
      });
    });
  });

  describe("failure", () => {
    it("builds an E_-prefixed code with data: null when no field errors are given", async () => {
      const res = await failure(404, "USR_NOT_FOUND");
      expect(res.status).toBe(404);
      await expect(readBody(res)).resolves.toEqual({
        code: "E_404_USR_NOT_FOUND",
        message: enCommon.apiMessages.USR_NOT_FOUND,
        data: null,
      });
    });

    it("nests field errors under data.errors when given", async () => {
      const res = await failure(422, "VALIDATION_FAILED", [
        { field: "email", issue: "Email is already registered" },
      ]);
      await expect(readBody(res)).resolves.toEqual({
        code: "E_422_VALIDATION_FAILED",
        message: enCommon.apiMessages.VALIDATION_FAILED,
        data: {
          errors: [{ field: "email", issue: "Email is already registered" }],
        },
      });
    });
  });
});

describe("fieldErrorMessage", () => {
  it("resolves a key from common.apiFieldErrors", async () => {
    await expect(fieldErrorMessage("nameRequired")).resolves.toBe(
      enCommon.apiFieldErrors.nameRequired,
    );
  });
});

describe("toListData", () => {
  it("reshapes a paginate() result into { items, pagination } with limit/totalItems/totalPages", () => {
    const result = toListData({
      data: [{ id: "1" }, { id: "2" }],
      page: 1,
      pageSize: 2,
      total: 5,
    });
    expect(result).toEqual({
      items: [{ id: "1" }, { id: "2" }],
      pagination: { page: 1, limit: 2, totalItems: 5, totalPages: 3 },
    });
  });

  it("reports totalPages of at least 1 for an empty result", () => {
    const result = toListData({ data: [], page: 1, pageSize: 10, total: 0 });
    expect(result.pagination.totalPages).toBe(1);
  });
});

describe("parsePageParams", () => {
  describe("with no query params", () => {
    it("defaults page to 1 and pageSize to 10", () => {
      const params = parsePageParams(new URL("http://localhost/x"));
      expect(params).toMatchObject({
        page: 1,
        pageSize: 10,
        search: "",
        sortDir: "asc",
        filters: {},
      });
    });

    it("falls back to defaultSortBy when sortBy isn't given", () => {
      expect(
        parsePageParams(new URL("http://localhost/x"), "name").sortBy,
      ).toBe("name");
    });
  });

  describe("with query params given", () => {
    it("reads page, pageSize, search, sortBy, sortDir from them", () => {
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
        filters: {},
      });
    });

    it("treats any other param as a filter", () => {
      const params = parsePageParams(
        new URL("http://localhost/x?status=active&role=viewer"),
      );
      expect(params.filters).toEqual({ status: "active", role: "viewer" });
    });

    it("omits a filter param given as an empty string", () => {
      const params = parsePageParams(new URL("http://localhost/x?status="));
      expect(params.filters).toEqual({});
    });
  });

  describe("with out-of-range or garbage input", () => {
    it("clamps page below 1 up to 1", () => {
      expect(parsePageParams(new URL("http://localhost/x?page=0")).page).toBe(
        1,
      );
      expect(parsePageParams(new URL("http://localhost/x?page=-5")).page).toBe(
        1,
      );
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
  });
});

describe("paginate", () => {
  const items = [
    {
      id: "1",
      name: "Kavya Iyer",
      email: "kavya@acme.example",
      status: "active",
    },
    {
      id: "2",
      name: "Rahul Verma",
      email: "rahul@acme.example",
      status: "invited",
    },
    {
      id: "3",
      name: "Meera Krishnan",
      email: "meera@acme.example",
      status: "active",
    },
  ];
  const baseParams: PageParams = {
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: null,
    sortDir: "asc",
    filters: {},
  };

  describe("with no search, filter, or sort applied", () => {
    it("returns everything, unsorted", () => {
      const result = paginate(items, baseParams, ["name", "email"]);
      expect(result).toEqual({ data: items, page: 1, pageSize: 10, total: 3 });
    });
  });

  describe("when searching", () => {
    it("filters by a case-insensitive substring match across the given fields", () => {
      const result = paginate(items, { ...baseParams, search: "rahul" }, [
        "name",
        "email",
      ]);
      expect(result.data).toEqual([items[1]]);
      expect(result.total).toBe(1);
    });
  });

  describe("when a filter is applied", () => {
    it("keeps only rows whose column exactly matches the filter value", () => {
      const result = paginate(
        items,
        { ...baseParams, filters: { status: "active" } },
        ["name", "email"],
      );
      expect(result.data).toEqual([items[0], items[2]]);
      expect(result.total).toBe(2);
    });

    it("combines with search -- both narrow the same result set", () => {
      const result = paginate(
        items,
        { ...baseParams, search: "meera", filters: { status: "active" } },
        ["name", "email"],
      );
      expect(result.data).toEqual([items[2]]);
    });
  });

  describe("when sorting", () => {
    it("sorts ascending by the given field", () => {
      const asc = paginate(items, { ...baseParams, sortBy: "name" }, ["name"]);
      expect(asc.data.map((i) => i.name)).toEqual([
        "Kavya Iyer",
        "Meera Krishnan",
        "Rahul Verma",
      ]);
    });

    it("sorts descending by the given field", () => {
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
  });

  describe("when paging", () => {
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
      const result = paginate(
        items,
        { ...baseParams, page: 99, pageSize: 10 },
        ["name"],
      );
      expect(result.data).toEqual([]);
      expect(result.total).toBe(3);
    });
  });
});
