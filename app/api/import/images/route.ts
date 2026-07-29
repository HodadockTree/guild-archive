import { migrateActivityImageData } from "@/src/lib/serverDb";
import { getAdminImportToken, getBearerToken } from "@/src/lib/serverAuth";
import { validateImageDataMigrationRequest } from "@/src/lib/imageDataMigration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestToken = getBearerToken(request);

  if (!requestToken) {
    return Response.json(
      { ok: false, error: "인증 토큰이 필요합니다." },
      { status: 401 },
    );
  }

  const adminToken = await getAdminImportToken();

  if (!adminToken || requestToken !== adminToken) {
    return Response.json(
      { ok: false, error: "인증에 실패했습니다." },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (contentLength > 5_000_000) {
    return Response.json(
      { ok: false, error: "요청 크기는 5MB를 초과할 수 없습니다." },
      { status: 413 },
    );
  }

  try {
    const body = validateImageDataMigrationRequest(await request.json());
    return Response.json(
      await migrateActivityImageData(body.mode, body.images),
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "과거 이미지 보충 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
