import { getCloudflareContext } from "@opennextjs/cloudflare";

const BEARER_TOKEN_PATTERN = /^Bearer\s+(.+)$/i;

export async function getAdminImportToken(): Promise<string | undefined> {
  const { env } = await getCloudflareContext({ async: true });
  return env.ADMIN_IMPORT_TOKEN;
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");

  if (!header) {
    return null;
  }

  const match = BEARER_TOKEN_PATTERN.exec(header.trim());
  const token = match?.[1]?.trim();

  return token ? token : null;
}
