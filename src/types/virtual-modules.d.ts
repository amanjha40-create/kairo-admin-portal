declare module "virtual:kairo-admin-auth-runtime" {
  export { createAdminAuthAdapter } from "@/features/admin/runtime/auth.demo";
}

declare module "virtual:kairo-admin-demo-credentials-runtime" {
  export {
    loadDemoCredentials,
    renderDemoCredentials,
  } from "@/features/admin/runtime/demo-credentials.demo";
}

declare module "virtual:kairo-admin-users-runtime" {
  export * from "@/features/admin/runtime/users.demo";
}

declare module "virtual:kairo-admin-communications-runtime" {
  export * from "@/features/admin/runtime/communications.demo";
}

declare module "virtual:kairo-admin-risk-runtime" {
  export * from "@/features/admin/runtime/risk.demo";
}

declare module "virtual:kairo-admin-system-runtime" {
  export * from "@/features/admin/runtime/system.demo";
}

declare module "virtual:kairo-admin-system-page-runtime" {
  export { SystemOperationsPage } from "@/features/admin/runtime/system-page.demo";
}

declare module "virtual:kairo-admin-verifications-runtime" {
  export * from "@/features/admin/runtime/verifications.demo";
}

declare module "virtual:kairo-admin-verification-review-runtime" {
  export * from "@/features/admin/runtime/verification-review.demo";
}

declare module "virtual:kairo-admin-settings-page-runtime" {
  export { AdminSettingsPage } from "@/features/admin/runtime/settings-page.demo";
}
