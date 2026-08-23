import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { forbiddenAbsoluteBuildPaths } from "./admin-artifact-safety.mjs";

if (process.env.VITE_ADMIN_DEMO_MODE === "true") {
  process.exit(0);
}

const artifactRoot = new URL("../.amplify-hosting/", import.meta.url);
const forbidden = [
  "mock-accounts",
  "mock-users",
  "mock-risk",
  "mock-system",
  "mock-communications",
  "mock-verification-cases",
  "jonas.weiss@example.com",
  "cand-101",
  "Wayne Industries",
  "Local demo credentials",
  "http://localhost:8000",
  "@example.invalid",
  "admin5-invite-",
  "admin5-failure-",
  "admin8-replay-",
  "admin8-revoked-",
  "STAGING_PHONE_OTP_CODE",
  "BREVO_API_KEY",
  "JWT_SECRET_KEY",
  "-----BEGIN PRIVATE KEY-----",
];
forbidden.push(...forbiddenAbsoluteBuildPaths);
const appEnvironment = process.env.VITE_APP_ENV ?? "production";
const requiredApiOrigin =
  appEnvironment === "staging" ? "https://staging-api.kairoid.com" : "https://api.kairoid.com";

if (appEnvironment === "production") {
  forbidden.push(
    "https://staging-api.kairoid.com",
    "admin-staging.kairoid.com",
    "codex-admin-verification-operations.d2bqzsobe5n064.amplifyapp.com",
  );
} else if (appEnvironment === "staging") {
  forbidden.push("https://api.kairoid.com");
}
const violations = [];
let requiredApiOriginFound = false;

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(path);
      continue;
    }

    const content = await readFile(path, "utf8").catch(() => null);
    if (content === null) continue;
    if (content.includes(requiredApiOrigin)) requiredApiOriginFound = true;
    for (const marker of forbidden) {
      if (entry.name.includes(marker) || content.includes(marker)) {
        violations.push(`${relative(artifactRoot.pathname, path)}: ${marker}`);
      }
    }
  }
}

await scan(artifactRoot.pathname);

if (violations.length > 0) {
  throw new Error(
    `Admin artifact contains forbidden data or build metadata:\n${violations.join("\n")}`,
  );
}

if (!requiredApiOriginFound) {
  throw new Error(`Admin artifact does not contain the required ${appEnvironment} API origin.`);
}

console.log(
  `${appEnvironment} Admin artifact contains no forbidden fixtures or environment leakage.`,
);
