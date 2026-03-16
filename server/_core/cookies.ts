import type { CookieOptions, Request } from "express";

function isLocalhost(hostname: string) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwarded = req.headers["x-forwarded-proto"];
  if (!forwarded) return false;
  const protoList = Array.isArray(forwarded) ? forwarded : forwarded.split(",");
  return protoList.some(p => p.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;

  const isLocal = isLocalhost(hostname);

  return {
    httpOnly: true,
    path: "/",
    sameSite: isLocal ? "lax" : "none", // ✅ "lax" works on localhost
    secure: !isLocal && isSecureRequest(req), // ✅ secure only in prod/HTTPS
  };
}