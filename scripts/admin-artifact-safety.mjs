const sourceRoutePathPattern = /(?:file:\/\/)?(?:\/[\w .@+-]+)+\/src\/routes\//g;

export function sanitizeArtifactText(content) {
  return content.replace(sourceRoutePathPattern, "src/routes/");
}

export const forbiddenAbsoluteBuildPaths = ["/Users/", "/home/", "/codebuild/output/", "file:///"];
