import { describe, expect, it } from "vitest";
import type { Session } from "next-auth";

import { can, filterNavByAccess, hasAccess, hasAnyRole } from "./permissions";

function makeSession(overrides: Partial<Session["user"]> = {}): Session {
  return {
    user: {
      id: "user-1",
      roles: ["viewer"],
      permissions: ["employees.read"],
      tenants: [],
      ...overrides,
    },
    accessToken: "token",
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

describe("can", () => {
  it("returns false for a null session", () => {
    expect(can("employees.read", null)).toBe(false);
  });

  it("returns true when the session has the permission", () => {
    expect(can("employees.read", makeSession())).toBe(true);
  });

  it("returns false when the session lacks the permission", () => {
    expect(can("employees.delete", makeSession())).toBe(false);
  });
});

describe("hasAnyRole", () => {
  it("returns true when no roles are required", () => {
    expect(hasAnyRole(undefined, null)).toBe(true);
    expect(hasAnyRole([], makeSession())).toBe(true);
  });

  it("returns false for a null session when roles are required", () => {
    expect(hasAnyRole(["admin"], null)).toBe(false);
  });

  it("returns true when the session has any of the required roles (OR)", () => {
    expect(
      hasAnyRole(["admin", "viewer"], makeSession({ roles: ["viewer"] })),
    ).toBe(true);
  });

  it("returns false when the session has none of the required roles", () => {
    expect(hasAnyRole(["admin"], makeSession({ roles: ["viewer"] }))).toBe(
      false,
    );
  });
});

describe("hasAccess", () => {
  it("hides an item with roles the session lacks, even if permission matches", () => {
    const session = makeSession({
      roles: ["viewer"],
      permissions: ["settings.read"],
    });
    expect(
      hasAccess(
        { roles: ["platform-admin"], permission: "settings.read" },
        session,
      ),
    ).toBe(false);
  });

  it("shows an item when both roles and permission match", () => {
    const session = makeSession({
      roles: ["platform-admin"],
      permissions: ["settings.read"],
    });
    expect(
      hasAccess(
        { roles: ["platform-admin"], permission: "settings.read" },
        session,
      ),
    ).toBe(true);
  });

  it("shows an item with neither roles nor permission set, for any session", () => {
    expect(hasAccess({}, makeSession())).toBe(true);
  });

  it("hides everything for a null session", () => {
    expect(hasAccess({}, null)).toBe(false);
  });
});

describe("filterNavByAccess", () => {
  const items = [
    { id: "dashboard", label: "Dashboard" },
    { id: "settings", label: "Settings", roles: ["platform-admin"] },
    { id: "users", label: "Users", permission: "users.read" },
  ];

  it("keeps items with no gate and items whose gate the session satisfies", () => {
    const session = makeSession({
      roles: ["platform-admin"],
      permissions: ["users.read"],
    });
    const visible = filterNavByAccess(items, session).map((i) => i.id);
    expect(visible).toEqual(["dashboard", "settings", "users"]);
  });

  it("drops items whose gate the session fails", () => {
    const session = makeSession({ roles: ["viewer"], permissions: [] });
    const visible = filterNavByAccess(items, session).map((i) => i.id);
    expect(visible).toEqual(["dashboard"]);
  });

  it("recurses into children, same rule applied at every level", () => {
    interface NestedItem {
      id: string;
      label: string;
      roles?: string[];
      children?: NestedItem[];
    }
    const nested: NestedItem[] = [
      {
        id: "parent",
        label: "Parent",
        children: [
          { id: "child-visible", label: "Child" },
          { id: "child-hidden", label: "Child", roles: ["platform-admin"] },
        ],
      },
    ];
    const session = makeSession({ roles: ["viewer"] });
    const result = filterNavByAccess(nested, session);
    expect(result[0].children?.map((c) => c.id)).toEqual(["child-visible"]);
  });
});
