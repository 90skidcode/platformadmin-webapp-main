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
  describe("with no session", () => {
    it("denies the permission", () => {
      expect(can("employees.read", null)).toBe(false);
    });
  });

  describe("with a session", () => {
    it("grants a permission the session has", () => {
      expect(can("employees.read", makeSession())).toBe(true);
    });

    it("denies a permission the session lacks", () => {
      expect(can("employees.delete", makeSession())).toBe(false);
    });
  });
});

describe("hasAnyRole", () => {
  describe("when no roles are required", () => {
    it("grants access even with no session", () => {
      expect(hasAnyRole(undefined, null)).toBe(true);
    });

    it("grants access to any session", () => {
      expect(hasAnyRole([], makeSession())).toBe(true);
    });
  });

  describe("when roles are required", () => {
    it("denies access with no session", () => {
      expect(hasAnyRole(["admin"], null)).toBe(false);
    });

    it("grants access when the session has any of the required roles (OR)", () => {
      expect(
        hasAnyRole(["admin", "viewer"], makeSession({ roles: ["viewer"] })),
      ).toBe(true);
    });

    it("denies access when the session has none of the required roles", () => {
      expect(hasAnyRole(["admin"], makeSession({ roles: ["viewer"] }))).toBe(
        false,
      );
    });
  });
});

describe("hasAccess", () => {
  describe("when an item gates on both roles and permission", () => {
    it("hides the item if roles don't match, even if permission does", () => {
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

    it("shows the item when both roles and permission match", () => {
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
  });

  describe("when an item has no gate at all", () => {
    it("shows the item for any session", () => {
      expect(hasAccess({}, makeSession())).toBe(true);
    });

    it("still hides it for a null session", () => {
      expect(hasAccess({}, null)).toBe(false);
    });
  });
});

describe("filterNavByAccess", () => {
  const items = [
    { id: "dashboard", label: "Dashboard" },
    { id: "settings", label: "Settings", roles: ["platform-admin"] },
    { id: "users", label: "Users", permission: "users.read" },
  ];

  describe("at the top level", () => {
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
  });

  describe("with nested children", () => {
    interface NestedItem {
      id: string;
      label: string;
      roles?: string[];
      children?: NestedItem[];
    }

    it("recurses into children, same rule applied at every level", () => {
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
});
