const NO_STORE = "private, no-store, max-age=0, must-revalidate";
const PRIVATE_S3_MEDIA_SOURCES = [
  "https://s3.amazonaws.com",
  "https://*.s3.amazonaws.com",
  "https://s3.us-east-1.amazonaws.com",
  "https://*.s3.us-east-1.amazonaws.com",
].join(" ");

export function buildAdminContentSecurityPolicy(
  apiBaseUrl: string,
  appEnvironment: string,
): string {
  let apiOrigin: string | null = null;
  if (apiBaseUrl) {
    apiOrigin = new URL(apiBaseUrl).origin;
  }
  if (
    ["staging", "production"].includes(appEnvironment) &&
    (!apiOrigin || !apiOrigin.startsWith("https://"))
  ) {
    throw new Error(
      "The Admin API origin must be configured with HTTPS outside local development.",
    );
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    apiOrigin ? `connect-src 'self' ${apiOrigin}` : "connect-src 'self'",
    `img-src 'self' data: blob: ${PRIVATE_S3_MEDIA_SOURCES}`,
    `frame-src 'self' ${PRIVATE_S3_MEDIA_SOURCES}`,
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function applyAdminSecurityHeaders(
  response: Response,
  apiBaseUrl: string,
  appEnvironment: string,
): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", NO_STORE);
  headers.set("Pragma", "no-cache");
  headers.set(
    "Content-Security-Policy",
    buildAdminContentSecurityPolicy(apiBaseUrl, appEnvironment),
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
