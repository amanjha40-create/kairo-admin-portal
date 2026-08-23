import { rm } from "node:fs/promises";

const artifactRoot = new URL("../.amplify-hosting/", import.meta.url);

await rm(artifactRoot, { force: true, recursive: true });
console.log("Removed any stale Admin hosting artifact before build.");
