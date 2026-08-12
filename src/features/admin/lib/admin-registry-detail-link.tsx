import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { buildAdminRegistryDetailLinkOptions } from "./admin-registry-route";

export function AdminRegistryDetailLink({
  organizationId,
  children,
  className,
}: {
  organizationId: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      {...buildAdminRegistryDetailLinkOptions(organizationId)}
      className={className}
      data-testid="admin-registry-detail-link"
    >
      {children}
    </Link>
  );
}
