import { getServerArchiveMonths } from "@/src/lib/serverDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({
      ok: true,
      months: await getServerArchiveMonths(),
    });
  } catch (error) {
    console.error("Failed to load archive months", error);
    return Response.json(
      {
        ok: false,
        error: "월별 기록 데이터를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
