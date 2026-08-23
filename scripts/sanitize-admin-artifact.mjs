import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { sanitizeArtifactText } from "./admin-artifact-safety.mjs";

const artifactRoot = new URL("../.amplify-hosting/", import.meta.url);
let sanitizedFileCount = 0;

async function sanitize(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await sanitize(path);
      continue;
    }

    const content = await readFile(path, "utf8").catch(() => null);
    if (content === null) continue;
    const sanitized = sanitizeArtifactText(content);
    if (sanitized === content) continue;
    await writeFile(path, sanitized, "utf8");
    sanitizedFileCount += 1;
  }
}

await sanitize(artifactRoot.pathname);
console.log(`Sanitized local source metadata from ${sanitizedFileCount} Admin artifact file(s).`);
