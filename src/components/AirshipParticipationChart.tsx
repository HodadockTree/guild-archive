import type { DashboardActivitySummary } from "@/src/lib/dashboardStats";
import { formatMonthDay } from "@/src/lib/displayFormat";
import { GamePanel, GamePanelHeader } from "@/src/components/ui/GameUI";

export function AirshipParticipationChart({
  activities,
}: {
  activities: DashboardActivitySummary[];
}) {
  const trends = [...activities]
    .filter((activity) => activity.statsType === "airship")
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const chartWidth = Math.max(640, trends.length * 76);
  const chartHeight = 190;
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
    <GamePanel className="min-w-0">
      <GamePanelHeader
        description="아우로라와 오션헤븐의 회차별 참여 인원 변화를 살펴봅니다."
        title="이번 달 비공정 참여 인원"
      />
      <div className="game-panel-body">
      <div aria-label="비공정 종류 범례" className="ui-caption mt-3 flex gap-4 text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-violet-400" />아우로라</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-cyan-500" />오션헤븐</span>
      </div>
      {trends.length === 0 ? (
        <p className="ui-empty-state mt-4">
          이번 달 비공정 기록이 없습니다.
        </p>
      ) : (
        <div className="mt-3 min-w-0 rounded-md bg-[var(--color-bg-muted)] p-3">
          <div className="max-w-full overflow-x-auto overscroll-x-contain">
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
                </g>
              );
            })}
            </svg>
          </div>
        </div>
      )}
      </div>
    </GamePanel>
  );
}
