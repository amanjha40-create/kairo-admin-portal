import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

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
];
const violations = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(path);
      continue;
    }

    const content = await readFile(path, "utf8").catch(() => null);
    if (content === null) continue;
    for (const marker of forbidden) {
      if (entry.name.includes(marker) || content.includes(marker)) {
        violations.push(`${relative(artifactRoot.pathname, path)}: ${marker}`);
      }
    }
  }
}

await scan(artifactRoot.pathname);

if (violations.length > 0) {
  throw new Error(`Production Admin artifact contains demo data:\n${violations.join("\n")}`);
}

console.log("Production Admin artifact contains no forbidden demo fixtures.");
