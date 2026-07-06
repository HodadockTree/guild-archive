import { getDb } from "@/src/lib/serverDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getDb().prepare("SELECT 1").get();

    return Response.json({
      ok: true,
      db: "connected",
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        db: "disconnected",
        error:
          error instanceof Error
            ? error.message
            : "DB 연결 확인 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
