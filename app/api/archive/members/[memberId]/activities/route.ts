import { getMemberActivityDetail } from "@/src/lib/memberActivity";
import { getServerActivities, getServerMembers } from "@/src/lib/serverDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await context.params;

  try {
    const [activities, members] = await Promise.all([
      getServerActivities(),
      getServerMembers(),
    ]);
    const detail = getMemberActivityDetail(activities, members, memberId);

    if (!detail) {
      return Response.json(
        { ok: false, error: "길드원을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return Response.json({ ok: true, detail });
  } catch {
    return Response.json(
      { ok: false, error: "길드원 활동 기록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
