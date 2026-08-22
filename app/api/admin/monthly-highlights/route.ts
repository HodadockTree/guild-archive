import {
  createServerMonthlyHighlight,
  getServerMonthlyHighlights,
  getServerMonthlyHighlightSourceActivityIds,
} from "@/src/lib/serverDb";
import { getAdminImportToken, getBearerToken } from "@/src/lib/serverAuth";
import { validateMonthlyHighlightInput } from "@/src/lib/monthlyHighlights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorized(request: Request) {
  const requestToken = getBearerToken(request);
  const adminToken = await getAdminImportToken();
  return Boolean(requestToken && adminToken && requestToken === adminToken);
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json(
      { ok: false, error: "인증에 실패했습니다." },
      { status: 401 },
    );
  }

  const searchParams = new URL(request.url).searchParams;
  if (searchParams.get("sources") === "1") {
    return Response.json({
      ok: true,
      sourceActivityIds: await getServerMonthlyHighlightSourceActivityIds(),
    });
  }
  const month = searchParams.get("month")?.trim();

  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return Response.json(
      { ok: false, error: "조회할 월을 YYYY-MM 형식으로 입력해 주세요." },
      { status: 400 },
    );
  }

  return Response.json({
    ok: true,
    highlights: await getServerMonthlyHighlights(month),
  });
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json(
      { ok: false, error: "인증에 실패했습니다." },
      { status: 401 },
    );
  }

  try {
    const input = validateMonthlyHighlightInput(await request.json());
    return Response.json(
      { ok: true, highlight: await createServerMonthlyHighlight(input) },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "월별 주요 기록을 저장하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
