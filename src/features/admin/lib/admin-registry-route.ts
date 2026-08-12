import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

export function buildAdminRegistryDetailLinkOptions(organizationId: string) {
  return {
    to: "/admin/registry/$organizationId" as const,
    params: { organizationId },
  };
}

export function getVerificationRegistryLinkModel(
  registryRecordId: string | null | undefined,
  registryName: string | null | undefined,
) {
  if (!registryRecordId) {
    return null;
  }

  return {
    organizationId: registryRecordId,
    label: registryName ?? registryRecordId,
  };
}

export async function navigateToAdminRegistryDetailForTest(organizationId: string) {
  const rootRoute = createRootRoute({
    component: () => null,
  });
  const registryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/admin/registry/$organizationId",
    component: () => null,
  });
  const routeTree = rootRoute.addChildren([registryRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: ["/"],
    }),
  });

  await router.navigate(buildAdminRegistryDetailLinkOptions(organizationId));
  return router.state.location.pathname;
}
