import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const ADMIN_SESSION_COOKIE = "guild_archive_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;
const encoder = new TextEncoder();

export async function getAdminImportToken(): Promise<string | undefined> {
  const { env } = await getCloudflareContext({ async: true });
  return env.ADMIN_IMPORT_TOKEN;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getSigningKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(`guild-archive-admin-session:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function verifyAdminPassword(password: string) {
  const secret = await getAdminImportToken();
  if (!secret || !password) return false;
  const key = await getSigningKey(secret);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(secret)));
  const supplied = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(password)));
  let difference = expected.length ^ supplied.length;
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ supplied[index];
  return difference === 0;
}

export async function createAdminSession() {
  const secret = await getAdminImportToken();
  if (!secret) throw new Error("ADMIN_IMPORT_TOKEN is not configured.");
  const payload = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE);
  const signature = await crypto.subtle.sign("HMAC", await getSigningKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAdminSession(session: string | undefined | null) {
  if (!session) return false;
  const [payload, encodedSignature, extra] = session.split(".");
  const expiresAt = Number(payload);
  if (extra || !payload || !encodedSignature || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
  const secret = await getAdminImportToken();
  if (!secret) return false;
  try {
    return await crypto.subtle.verify("HMAC", await getSigningKey(secret), fromBase64Url(encodedSignature), encoder.encode(payload));
  } catch {
    return false;
  }
}

export async function isAdminRequestAuthorized(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))?.slice(ADMIN_SESSION_COOKIE.length + 1);
  try {
    return verifyAdminSession(cookie ? decodeURIComponent(cookie) : null);
  } catch {
    return false;
  }
}
