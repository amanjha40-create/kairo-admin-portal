import { describe, expect, it } from "vitest";
import { canFindCandidatesFromOverview } from "./overview-quick-actions";

describe("Overview quick action permissions", () => {
  it("does not expose the Candidate directory to a restricted Support actor", () => {
    expect(canFindCandidatesFromOverview(["system.view", "communications.view"])).toBe(false);
  });

  it("enables Candidate search only with the canonical users.view permission", () => {
    expect(canFindCandidatesFromOverview(["users.view"])).toBe(true);
  });
});
