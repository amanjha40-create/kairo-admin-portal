import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Users directory search lifecycle", () => {
  it("keeps the search control mounted while a changed query loads", () => {
    const source = readFileSync(new URL("./admin.users.index.tsx", import.meta.url), "utf8");

    expect(source).not.toContain("if (listQuery.isPending)");
    expect(source).toContain("listQuery.isPending && !result");
    expect(source).toContain("<AdminSearchField");
    expect(source).toContain("value={query}");
  });
});
