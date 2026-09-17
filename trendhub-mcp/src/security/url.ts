import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIp(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "metadata.google.internal") return true;
  const family = net.isIP(host);
  if (family === 4) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
  }
  if (family === 6) {
    return host === "::" || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb") || host.startsWith("::ffff:127.") || host.startsWith("::ffff:10.") || host.startsWith("::ffff:192.168.");
  }
  return false;
}

/** Reject obvious SSRF targets before any remote fetch is attempted. */
export function assertSafeHttpUrl(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("URL must be absolute and valid"); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("only http(s) URLs are allowed");
  if (url.username || url.password) throw new Error("URLs with embedded credentials are not allowed");
  if (isPrivateIp(url.hostname)) throw new Error("private, loopback or metadata hosts are not allowed");
  return url;
}

/** Resolve hostnames and reject DNS results that point at local networks. */
export async function assertSafeRemoteUrl(input: string): Promise<URL> {
  const url = assertSafeHttpUrl(input);
  if (net.isIP(url.hostname)) return url;
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) throw new Error("URL resolves to a private, loopback or metadata address");
  return url;
}

