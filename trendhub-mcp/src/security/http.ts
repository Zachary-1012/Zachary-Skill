import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

/** True only for loopback hostnames/addresses. */
export function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (normalized === "localhost" || normalized === "::1") return true;
  const m = normalized.match(/^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  return m.slice(1).every((part) => Number(part) >= 0 && Number(part) <= 255);
}

/**
 * Public distribution must stay frictionless on one machine, but any bind that
 * leaves loopback requires an explicit bearer token.
 */
export function assertHttpNetworkBoundary(host: string, token: string): void {
  if (!isLoopbackHost(host) && !token.trim()) {
    throw new Error(
      `Refusing non-loopback HTTP bind (${host}) without TRENTHUB_HTTP_TOKEN. ` +
        "Keep TRENTHUB_HOST=127.0.0.1 for local use, or set a strong TRENTHUB_HTTP_TOKEN for LAN/private-network access.",
    );
  }
}

/** Constant-time bearer-token comparison. Empty token means local unauthenticated mode. */
export function isHttpAuthorized(req: IncomingMessage, token: string): boolean {
  const expectedToken = token.trim();
  if (!expectedToken) return true;

  const actual = req.headers.authorization ?? "";
  const expected = `Bearer ${expectedToken}`;
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
