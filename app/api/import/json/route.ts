import { importBackupJson } from "@/src/lib/serverDb";
import { getAdminImportToken, getBearerToken } from "@/src/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestToken = getBearerToken(request);

  if (!requestToken) {
    return Response.json(
      {
        ok: false,
        error: "인증 토큰이 필요합니다.",
      },
      { status: 401 },
    );
  }

  const adminToken = await getAdminImportToken();

  if (!adminToken || requestToken !== adminToken) {
    return Response.json(
      {
        ok: false,
        error: "인증에 실패했습니다.",
      },
      { status: 403 },
    );
  }

  let data: unknown;

  try {
    data = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "JSON 형식이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  try {
    return Response.json(await importBackupJson(data));
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "서버 DB 가져오기 중 오류가 발생했습니다.",
      },
      { status: 400 },
    );
  }
}
