import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sanitizeArtifactText } from "./admin-artifact-safety.mjs";

describe("Admin artifact path sanitization", () => {
  it("removes local macOS route source paths", () => {
    assert.equal(
      sanitizeArtifactText(
        'filePath: "/Users/Aman/Desktop/work/kairo-admin-portal/src/routes/admin.tsx"',
      ),
      'filePath: "src/routes/admin.tsx"',
    );
  });

  it("removes CodeBuild route source paths", () => {
    assert.equal(
      sanitizeArtifactText(
        'filePath: "/codebuild/output/src123/src/kairo-admin/src/routes/admin.tsx"',
      ),
      'filePath: "src/routes/admin.tsx"',
    );
  });

  it("preserves relative route paths and Nitro listener output", () => {
    const content = 'filePath: "src/routes/admin.tsx"; console.log("http://localhost:3000")';
    assert.equal(sanitizeArtifactText(content), content);
  });
});
