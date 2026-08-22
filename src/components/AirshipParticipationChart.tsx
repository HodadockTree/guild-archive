import type { DashboardActivitySummary } from "@/src/lib/dashboardStats";
import { formatMonthDay } from "@/src/lib/displayFormat";

export function AirshipParticipationChart({
  activities,
}: {
  activities: DashboardActivitySummary[];
}) {
  const trends = [...activities]
    .filter((activity) => activity.statsType === "airship")
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const chartWidth = Math.max(640, trends.length * 76);
  const chartHeight = 210;
  const plotLeft = 36;
  const plotRight = chartWidth - 28;
  const plotTop = 28;
  const plotBottom = 154;
  const maxValue = Math.max(...trends.map((trend) => trend.participantCount), 1);
  const getX = (index: number) =>
    trends.length <= 1
      ? chartWidth / 2
      : plotLeft + ((plotRight - plotLeft) * index) / (trends.length - 1);
  const getY = (value: number) =>
    plotBottom - (value / maxValue) * (plotBottom - plotTop);
  const points = trends
    .map((trend, index) => `${getX(index)},${getY(trend.participantCount)}`)
    .join(" ");

  return (
    <section className="rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/50">
      <h2 className="text-lg font-semibold text-slate-900">이번 달 비공정 참여 흐름</h2>
      <p className="mt-1 text-sm text-slate-500">
        아우로라와 오션헤븐의 회차별 참여 인원 변화를 비교합니다.
      </p>
      <div aria-label="비공정 종류 범례" className="mt-3 flex gap-4 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-violet-400" />아우로라</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-cyan-500" />오션헤븐</span>
      </div>
      {trends.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">
          이번 달 비공정 기록이 없습니다.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <svg
            aria-label="이번 달 비공정 회차별 참여 인원 변화"
            className="h-auto min-w-[40rem]"
            role="img"
            style={{ width: chartWidth }}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          >
            {[0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = plotBottom - (plotBottom - plotTop) * ratio;
              return <line className="stroke-sky-100" key={ratio} x1={plotLeft} x2={plotRight} y1={y} y2={y} />;
            })}
            <polyline fill="none" points={points} stroke="#94a3b8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            {trends.map((trend, index) => {
              const isAurora = trend.airshipType === "aurora";
              const x = getX(index);
              const y = getY(trend.participantCount);

              return (
                <g key={trend.id}>
                  <title>{`${formatMonthDay(trend.date)} ${trend.label} · ${trend.participantCount}명`}</title>
                  <circle cx={x} cy={y} fill={isAurora ? "#a78bfa" : "#06b6d4"} r="6" />
                  <text className="fill-slate-700 text-[11px] font-bold" textAnchor="middle" x={x} y={y - 12}>{trend.participantCount}명</text>
                  <text className="fill-slate-500 text-[10px]" textAnchor="middle" x={x} y="178">{formatMonthDay(trend.date)}</text>
                  <text className="fill-slate-700 text-[10px] font-medium" textAnchor="middle" x={x} y="195">{isAurora ? "아우로라" : "오션헤븐"}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
