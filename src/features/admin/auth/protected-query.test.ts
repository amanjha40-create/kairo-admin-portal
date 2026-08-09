import { describe, expect, it } from "vitest";
import { shouldEnableAdminProtectedQuery } from "./protected-query";

describe("shouldEnableAdminProtectedQuery", () => {
  it("enables protected admin queries only after access is granted", () => {
    expect(shouldEnableAdminProtectedQuery("checking")).toBe(false);
    expect(shouldEnableAdminProtectedQuery("denied")).toBe(false);
    expect(shouldEnableAdminProtectedQuery("expired")).toBe(false);
    expect(shouldEnableAdminProtectedQuery("error")).toBe(false);
    expect(shouldEnableAdminProtectedQuery("granted")).toBe(true);
  });
});
