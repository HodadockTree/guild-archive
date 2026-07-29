import {
  deleteServerMonthlyHighlight,
  updateServerMonthlyHighlight,
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthorized(request))) {
    return Response.json(
      { ok: false, error: "인증에 실패했습니다." },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const input = validateMonthlyHighlightInput(await request.json());
    const highlight = await updateServerMonthlyHighlight(id, input);

    if (!highlight) {
      return Response.json(
        { ok: false, error: "수정할 주요 기록을 찾지 못했습니다." },
        { status: 404 },
      );
    }

    return Response.json({ ok: true, highlight });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "월별 주요 기록을 수정하지 못했습니다.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthorized(request))) {
    return Response.json(
      { ok: false, error: "인증에 실패했습니다." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const deleted = await deleteServerMonthlyHighlight(id);

  if (!deleted) {
    return Response.json(
      { ok: false, error: "삭제할 주요 기록을 찾지 못했습니다." },
      { status: 404 },
    );
  }

  return Response.json({ ok: true });
}
