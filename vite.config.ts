// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const isDemoModeBuild = process.env.VITE_ADMIN_DEMO_MODE === "true";

function createAdminRuntimePlugin(): Plugin {
  const runtimeTargets: Record<string, string> = {
    "virtual:kairo-admin-auth-runtime": fileURLToPath(
      new URL(
        isDemoModeBuild
          ? "./src/features/admin/runtime/auth.demo.ts"
          : "./src/features/admin/runtime/auth.production.ts",
        import.meta.url,
      ),
    ),
    "virtual:kairo-admin-demo-credentials-runtime": fileURLToPath(
      new URL(
        isDemoModeBuild
          ? "./src/features/admin/runtime/demo-credentials.demo.ts"
          : "./src/features/admin/runtime/demo-credentials.production.ts",
        import.meta.url,
      ),
    ),
    "virtual:kairo-admin-users-runtime": fileURLToPath(
      new URL(
        isDemoModeBuild
          ? "./src/features/admin/runtime/users.demo.ts"
          : "./src/features/admin/runtime/users.production.ts",
        import.meta.url,
      ),
    ),
    "virtual:kairo-admin-communications-runtime": fileURLToPath(
      new URL(
        isDemoModeBuild
          ? "./src/features/admin/runtime/communications.demo.ts"
          : "./src/features/admin/runtime/communications.production.ts",
        import.meta.url,
      ),
    ),
    "virtual:kairo-admin-risk-runtime": fileURLToPath(
      new URL(
        isDemoModeBuild
          ? "./src/features/admin/runtime/risk.demo.ts"
          : "./src/features/admin/runtime/risk.production.ts",
        import.meta.url,
      ),
    ),
    "virtual:kairo-admin-system-runtime": fileURLToPath(
      new URL(
        isDemoModeBuild
          ? "./src/features/admin/runtime/system.demo.ts"
          : "./src/features/admin/runtime/system.production.ts",
        import.meta.url,
      ),
    ),
    "virtual:kairo-admin-system-page-runtime": fileURLToPath(
      new URL(
        isDemoModeBuild
          ? "./src/features/admin/runtime/system-page.demo.ts"
          : "./src/features/admin/runtime/system-page.production.ts",
        import.meta.url,
      ),
    ),
    "virtual:kairo-admin-verifications-runtime": fileURLToPath(
      new URL(
        isDemoModeBuild
          ? "./src/features/admin/runtime/verifications.demo.ts"
          : "./src/features/admin/runtime/verifications.production.ts",
        import.meta.url,
      ),
    ),
    "virtual:kairo-admin-verification-review-runtime": fileURLToPath(
      new URL(
        isDemoModeBuild
          ? "./src/features/admin/runtime/verification-review.demo.ts"
          : "./src/features/admin/runtime/verification-review.production.ts",
        import.meta.url,
      ),
    ),
    "virtual:kairo-admin-settings-page-runtime": fileURLToPath(
      new URL(
        isDemoModeBuild
          ? "./src/features/admin/runtime/settings-page.demo.ts"
          : "./src/features/admin/runtime/settings-page.production.ts",
        import.meta.url,
      ),
    ),
  };

  return {
    name: "kairo-admin-runtime",
    enforce: "pre",
    resolveId(source) {
      return runtimeTargets[source] ?? null;
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: process.env.NITRO_PRESET ?? "aws_amplify",
  },
  vite: {
    plugins: [createAdminRuntimePlugin()],
  },
});
