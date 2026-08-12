import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { AdminRegistryDetailLink } from "./admin-registry-detail-link";
import {
  buildAdminRegistryDetailLinkOptions,
  getVerificationRegistryLinkModel,
  navigateToAdminRegistryDetailForTest,
} from "./admin-registry-route";

describe("admin registry route links", () => {
  it("builds canonical registry detail route options", () => {
    expect(buildAdminRegistryDetailLinkOptions("b7ab6443-66ef-4cc9-8819-c1f4fb5a18ee")).toEqual({
      to: "/admin/registry/$organizationId",
      params: { organizationId: "b7ab6443-66ef-4cc9-8819-c1f4fb5a18ee" },
    });
  });

  it("returns a verification registry link model only when backend linkage exists", () => {
    expect(
      getVerificationRegistryLinkModel(
        "b7ab6443-66ef-4cc9-8819-c1f4fb5a18ee",
        "Kairo Durability Test University",
      ),
    ).toEqual({
      organizationId: "b7ab6443-66ef-4cc9-8819-c1f4fb5a18ee",
      label: "Kairo Durability Test University",
    });

    expect(getVerificationRegistryLinkModel(null, "Kairo Durability Test University")).toBeNull();
    expect(getVerificationRegistryLinkModel(undefined, undefined)).toBeNull();
  });

  it("renders a route link element that targets the canonical registry detail route", () => {
    const element = AdminRegistryDetailLink({
      organizationId: "b7ab6443-66ef-4cc9-8819-c1f4fb5a18ee",
      className: "test-link",
      children: "Kairo Durability Test University",
    }) as ReactElement<Record<string, unknown>>;

    expect(element.props["data-testid"]).toBe("admin-registry-detail-link");
    expect(element.props.to).toBe("/admin/registry/$organizationId");
    expect(element.props.params).toEqual({
      organizationId: "b7ab6443-66ef-4cc9-8819-c1f4fb5a18ee",
    });
    expect(element.props.children).toBe("Kairo Durability Test University");
  });

  it("navigates the router to the intended admin registry detail path", async () => {
    await expect(
      navigateToAdminRegistryDetailForTest("b7ab6443-66ef-4cc9-8819-c1f4fb5a18ee"),
    ).resolves.toBe("/admin/registry/b7ab6443-66ef-4cc9-8819-c1f4fb5a18ee");
  });
});
