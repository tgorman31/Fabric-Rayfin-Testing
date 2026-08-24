import { describe, expect, it } from "vitest";

import { hasProjectRegisterAccess, type ProjectRegisterRole } from "@/domain/projectRegisterAccess";

const today = "2026-08-23";
const role = (overrides: Partial<ProjectRegisterRole> = {}): ProjectRegisterRole => ({
  role_code: "project_register_user",
  active_flag: true,
  effective_from: "2026-01-01",
  effective_to: undefined,
  ...overrides,
});

describe("Project Register access", () => {
  it("allows no roles for compatibility", () => {
    expect(hasProjectRegisterAccess([], today)).toBe(true);
  });

  it("allows an unrelated project index admin role", () => {
    expect(hasProjectRegisterAccess([role({ role_code: "project_index_admin" })], today)).toBe(true);
  });

  it("allows multiple unrelated roles", () => {
    expect(hasProjectRegisterAccess([
      role({ role_code: "project_index_admin" }),
      role({ role_code: "other_application_role" }),
    ], today)).toBe(true);
  });

  it("allows an active effective Project Register role", () => {
    expect(hasProjectRegisterAccess([role()], today)).toBe(true);
  });

  it("denies an inactive Project Register role", () => {
    expect(hasProjectRegisterAccess([role({ active_flag: false })], today)).toBe(false);
  });

  it("denies a future Project Register role", () => {
    expect(hasProjectRegisterAccess([role({ effective_from: "2026-08-24" })], today)).toBe(false);
  });

  it("denies an expired Project Register role", () => {
    expect(hasProjectRegisterAccess([role({ effective_to: "2026-08-22" })], today)).toBe(false);
  });

  it("includes both effective date boundaries", () => {
    expect(hasProjectRegisterAccess([role({ effective_from: today })], today)).toBe(true);
    expect(hasProjectRegisterAccess([role({ effective_to: today })], today)).toBe(true);
  });

  it("allows when one of multiple Project Register roles is effective", () => {
    expect(hasProjectRegisterAccess([
      role({ effective_from: "2026-08-24" }),
      role({ effective_from: "2026-01-01", effective_to: today }),
    ], today)).toBe(true);
  });

  it("does not let an unrelated active role rescue an ineffective Register role", () => {
    expect(hasProjectRegisterAccess([
      role({ effective_to: "2026-08-22" }),
      role({ role_code: "project_index_admin" }),
    ], today)).toBe(false);
  });
});
