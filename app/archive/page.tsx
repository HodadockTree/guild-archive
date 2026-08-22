"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MonthlyArchiveSummary } from "@/src/lib/monthlyArchive";
import { getMonthDisplayLabel } from "@/src/lib/monthlyArchive";
import { AppHeader } from "@/src/components/ui/AppHeader";
import {
  GuildFlowChart,
  MonthlyAirshipAverageChart,
} from "@/src/components/MonthlyTrendChart";
import { Surface } from "@/src/components/ui/Surface";
import type { MonthlyHighlightCategory } from "@/src/types";

type ServerMonthlyArchiveSummary = MonthlyArchiveSummary & {
  representativeEventTitle: string | null;
  highlightCount: number;
  representativeHighlightTitle: string | null;
  representativeHighlights?: Array<{
    id: string;
    category: MonthlyHighlightCategory;
    title: string;
  }>;
};

type ArchiveState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; months: ServerMonthlyArchiveSummary[] };

export default function ArchivePage() {
  const [archiveState, setArchiveState] = useState<ArchiveState>({
    status: "loading",
  });
  useEffect(() => {
    let isActive = true;

    async function loadArchiveMonths() {
      setArchiveState({ status: "loading" });

      try {
        const response = await fetch("/api/archive/months", {
          cache: "no-store",
        });
        const data: unknown = await response.json();

        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null ||
          !("months" in data) ||
          !Array.isArray(data.months)
        ) {
          throw new Error("월별 기록 데이터를 불러오지 못했습니다.");
        }

        if (isActive) {
          setArchiveState({
            status: "success",
            months: data.months as ServerMonthlyArchiveSummary[],
          });
        }
      } catch (error) {
        if (isActive) {
          setArchiveState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "월별 기록 데이터를 불러오지 못했습니다.",
          });
        }
      }
    }

    loadArchiveMonths();

    return () => {
      isActive = false;
    };
  }, []);

  const monthlySummaries =
    archiveState.status === "success" ? archiveState.months : [];
  const monthlyTrends = [...monthlySummaries].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  return (
    <main className="app-shell">
      <AppHeader
        currentPath="/archive"
        description="월별로 쌓인 길드 활동을 살펴보고, 원하는 달의 리포트를 확인할 수 있습니다."
        eyebrow="월별 활동 기록"
        title="냥춘 월별 기록"
      />

      {archiveState.status === "loading" ? (
        <Surface className="py-10 text-center" variant="section">
          <h2 className="ui-section-title">
            월별 기록을 불러오는 중입니다.
          </h2>
        </Surface>
      ) : null}

      {archiveState.status === "error" ? (
        <section className="rounded-md border border-red-100 bg-red-50 px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-red-800">
            월별 기록을 불러오지 못했습니다.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
            {archiveState.message}
          </p>
        </section>
      ) : null}

      {archiveState.status === "success" && monthlySummaries.length === 0 ? (
        <section className="ui-empty-state ui-empty-state-surface px-5 py-10">
          <h2 className="ui-section-title">
            아직 기록된 활동이 없습니다.
          </h2>
          <p className="ui-supporting-text mx-auto mt-2 max-w-xl">
            활동 기록이 생기면 월별 기록이 표시됩니다.
          </p>
        </section>
      ) : null}

      {archiveState.status === "success" && monthlySummaries.length > 0 ? (
        <Surface aria-label="월별 기록 목록" variant="section">
          <div className="grid gap-3">
            {monthlySummaries.map((summary) => (
              <Link
                aria-label={`${getMonthDisplayLabel(summary.month)} 월간 리포트 보기`}
                className="ui-focus-ring block rounded-[var(--radius-card)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-4 py-3 transition-colors hover:border-[var(--color-border-interactive)] hover:bg-[var(--color-bg-interactive)]"
                href={`/viewer?month=${summary.month}`}
                id={`archive-month-${summary.month}`}
                key={summary.month}
              >
                <h2 className="ui-card-title sm:text-lg">
                  {getMonthDisplayLabel(summary.month)}
                </h2>
                <p className="ui-supporting-text mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span>활동 <strong className="ui-metric-inline">{summary.activityCount}회</strong></span>
                  <span>길드원 <strong className="ui-metric-inline">{summary.participantMemberCount}명</strong></span>
                  <span>총 참여 <strong className="ui-metric-inline">{summary.totalParticipationCount}회</strong></span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                {(summary.representativeHighlights?.length ?? 0) > 0 ? (
                  <ul className="flex flex-wrap gap-1.5" aria-label="주요 기록">
                    {summary.representativeHighlights?.map((highlight, index) => (
                      <li
                        className={`max-w-full rounded-full px-2 py-0.5 text-xs leading-5 break-words ${
                          index === 0
                            ? "bg-[var(--color-brand-soft)] font-semibold text-[var(--color-text-accent)]"
                            : "bg-[var(--color-bg-muted)] font-medium text-[var(--color-text-secondary)]"
                        }`}
                        key={highlight.id}
                      >
                        {highlight.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {summary.representativeEvents.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5" aria-label="대표 이벤트">
                    {summary.representativeEvents.map((event) => (
                      <li
                        className="max-w-full rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-xs leading-5 break-words text-[var(--color-text-secondary)]"
                        key={event.id}
                      >
                        {event.title}
                      </li>
                    ))}
                  </ul>
                ) : null}
                </div>
              </Link>
            ))}
          </div>
        </Surface>
      ) : null}

      {archiveState.status === "success" ? (
        <>
          <GuildFlowChart trends={monthlyTrends} />
          <MonthlyAirshipAverageChart trends={monthlyTrends} />
        </>
      ) : null}
    </main>
  );
}
