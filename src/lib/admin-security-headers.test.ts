import { describe, expect, it } from "vitest";
import {
  applyAdminSecurityHeaders,
  buildAdminContentSecurityPolicy,
} from "./admin-security-headers";

describe("Admin security headers", () => {
  it("limits production connections to the configured production API origin", () => {
    const policy = buildAdminContentSecurityPolicy("https://api.kairoid.com", "production");

    expect(policy).toContain("connect-src 'self' https://api.kairoid.com");
    expect(policy).toContain("frame-src 'self' https://s3.amazonaws.com");
    expect(policy).toContain("https://*.s3.us-east-1.amazonaws.com");
    expect(policy).toContain("img-src 'self' data: blob: https://s3.amazonaws.com");
    expect(policy).not.toContain("staging-api.kairoid.com");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("rejects insecure API origins outside local development", () => {
    expect(() => buildAdminContentSecurityPolicy("http://localhost:8000", "staging")).toThrow(
      "configured with HTTPS",
    );
  });

  it("keeps local Demo Mode available without an API origin", () => {
    expect(buildAdminContentSecurityPolicy("", "development")).toContain("connect-src 'self'");
  });

  it("marks SSR responses private and non-cacheable", async () => {
    const secured = applyAdminSecurityHeaders(
      new Response("ok", { headers: { "Content-Type": "text/html" } }),
      "https://api.kairoid.com",
      "production",
    );

    expect(await secured.text()).toBe("ok");
    expect(secured.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
    expect(secured.headers.get("content-security-policy")).toContain(
      "connect-src 'self' https://api.kairoid.com",
    );
    expect(secured.headers.get("x-frame-options")).toBe("DENY");
  });
});
