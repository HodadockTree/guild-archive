import { getServerMonthlyReport } from "@/src/lib/serverDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ month: string }> },
) {
  const { month } = await context.params;

  if (!MONTH_PATTERN.test(month)) {
    return Response.json(
      {
        ok: false,
        error: "month는 YYYY-MM 형식이어야 합니다.",
      },
      { status: 400 },
    );
  }

  try {
    return Response.json({
      ok: true,
      ...(await getServerMonthlyReport(month)),
    });
  } catch (error) {
    console.error(`Failed to load monthly report for ${month}`, error);
    return Response.json(
      {
        ok: false,
        error: "월간 리포트 데이터를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
