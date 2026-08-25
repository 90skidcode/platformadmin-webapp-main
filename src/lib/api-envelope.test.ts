import { describe, expect, it } from "vitest";

import { buildCode, isErrorEnvelope, statusPrefixOf } from "./api-envelope";

describe("buildCode", () => {
  it("joins status prefix, http status, and business code with underscores", () => {
    expect(buildCode("S", 201, "USR_CREATED")).toBe("S_201_USR_CREATED");
  });
});

describe("statusPrefixOf", () => {
  it("reads the leading S/W/E segment off a well-formed code", () => {
    expect(statusPrefixOf("S_200_USR_LIST_OK")).toBe("S");
    expect(statusPrefixOf("W_201_USR_CREATED_EMAIL_FAILED")).toBe("W");
    expect(statusPrefixOf("E_404_USR_NOT_FOUND")).toBe("E");
  });

  it("returns null for a missing or malformed code, rather than throwing", () => {
    expect(statusPrefixOf(undefined)).toBeNull();
    expect(statusPrefixOf("")).toBeNull();
    expect(statusPrefixOf("200_USR_LIST_OK")).toBeNull();
  });
});

describe("isErrorEnvelope", () => {
  it("is true only for an E_-prefixed code", () => {
    expect(isErrorEnvelope("E_422_VALIDATION_FAILED")).toBe(true);
    expect(isErrorEnvelope("S_200_USR_LIST_OK")).toBe(false);
    expect(isErrorEnvelope("W_201_USR_CREATED_EMAIL_FAILED")).toBe(false);
    expect(isErrorEnvelope(undefined)).toBe(false);
  });
});
