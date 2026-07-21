import { getGuildDashboardStats } from "@/src/lib/dashboardStats";
import { getServerActivities, getServerMembers } from "@/src/lib/serverDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function today() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const [activities, members] = await Promise.all([
      getServerActivities(),
      getServerMembers(),
    ]);

    return Response.json({
      ok: true,
      dashboard: getGuildDashboardStats(activities, members, today()),
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: "홈 데이터를 불러오지 못했습니다.",
      },
      { status: 500 },
    );
  }
}
