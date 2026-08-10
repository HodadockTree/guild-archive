"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MonthlyArchiveSummary } from "@/src/lib/monthlyArchive";
import { getMonthDisplayLabel } from "@/src/lib/monthlyArchive";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { GuildFlowChart } from "@/src/components/MonthlyTrendChart";
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

function getMonthlyRecords(summary: ServerMonthlyArchiveSummary) {
  const records = new Map<string, { emphasized: boolean; title: string }>();

  (summary.representativeHighlights ?? []).forEach((highlight) => {
    records.set(highlight.title, {
      emphasized: highlight.category === "game_event",
      title: highlight.title,
    });
  });
  summary.representativeEvents.forEach((event) => {
    if (!records.has(event.title)) {
      records.set(event.title, { emphasized: false, title: event.title });
    }
  });

  return Array.from(records.values());
}

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
        <section className="rounded-md border border-sky-100 bg-white px-5 py-10 text-center shadow-sm shadow-sky-100/50">
          <h2 className="text-lg font-semibold text-slate-900">
            월별 기록을 불러오는 중입니다.
          </h2>
        </section>
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

      {archiveState.status === "success" ? (
        <GuildFlowChart trends={monthlyTrends} />
      ) : null}

      {archiveState.status === "success" && monthlySummaries.length === 0 ? (
        <section className="rounded-md border border-dashed border-sky-200 bg-white px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            아직 기록된 활동이 없습니다.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            활동 기록이 생기면 월별 기록이 표시됩니다.
          </p>
        </section>
      ) : null}

      {archiveState.status === "success" && monthlySummaries.length > 0 ? (
        <section className="grid gap-3">
          {monthlySummaries.map((summary) => {
            const records = getMonthlyRecords(summary);

            return (
              <Link
              aria-label={`${getMonthDisplayLabel(summary.month)} 월간 리포트 보기`}
              className="ui-focus-ring block rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-2.5 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/40 focus-visible:border-sky-300 focus-visible:bg-sky-50/40 sm:px-4 sm:py-3"
              href={`/viewer?month=${summary.month}`}
              id={`archive-month-${summary.month}`}
              key={summary.month}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">
                  {getMonthDisplayLabel(summary.month)}
                </h2>
                {records.length > 0 ? (
                  <p className="min-w-0 text-sm leading-5 text-slate-600 sm:text-base">
                    {records.map((record, index) => (
                      <span
                        className={
                          record.emphasized
                            ? "font-semibold text-slate-800"
                            : undefined
                        }
                        key={record.title}
                      >
                        {index > 0 ? " · " : null}
                        {record.title}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                활동 {summary.activityCount}회 · 함께한 길드원{" "}
                {summary.participantMemberCount}명 · 총 참여{" "}
                {summary.totalParticipationCount}회
              </p>
              </Link>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
