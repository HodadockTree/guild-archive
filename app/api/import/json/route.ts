import { importBackupJson } from "@/src/lib/serverDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
    return Response.json(importBackupJson(data));
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
