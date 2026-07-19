"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MonthlyArchiveSummary } from "@/src/lib/monthlyArchive";
import { getMonthDisplayLabel } from "@/src/lib/monthlyArchive";
import { AppHeader } from "@/src/components/ui/AppHeader";

type ServerMonthlyArchiveSummary = MonthlyArchiveSummary & {
  representativeEventTitle: string | null;
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
          throw new Error("월별 아카이브 데이터를 불러오지 못했습니다.");
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
                : "월별 아카이브 데이터를 불러오지 못했습니다.",
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

  return (
    <main className="app-shell">
      <AppHeader
        currentPath="/archive"
        description="월별로 모인 활동 기록을 살펴보고, 원하는 달의 리포트로 이동할 수 있습니다."
        eyebrow="월별 활동 아카이브"
        title="냥춘 활동 아카이브"
      />

      {archiveState.status === "loading" ? (
        <section className="rounded-md border border-sky-100 bg-white px-5 py-10 text-center shadow-sm shadow-sky-100/50">
          <h2 className="text-lg font-semibold text-slate-900">
            아카이브 데이터를 불러오는 중입니다.
          </h2>
        </section>
      ) : null}

      {archiveState.status === "error" ? (
        <section className="rounded-md border border-red-100 bg-red-50 px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-red-800">
            아카이브 데이터를 불러오지 못했습니다.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-700">
            {archiveState.message}
          </p>
        </section>
      ) : null}

      {archiveState.status === "success" && monthlySummaries.length === 0 ? (
        <section className="rounded-md border border-dashed border-sky-200 bg-white px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            아직 기록된 활동이 없습니다.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            활동 기록이 생기면 월별 아카이브가 표시됩니다.
          </p>
        </section>
      ) : null}

      {archiveState.status === "success" && monthlySummaries.length > 0 ? (
        <section className="grid gap-3">
          {monthlySummaries.map((summary) => (
            <Link
              className="ui-focus-ring group block rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-3 shadow-sm transition hover:border-sky-300 hover:bg-[var(--surface-muted)]"
              href={`/viewer?month=${summary.month}`}
              key={summary.month}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <div className="min-w-0 space-y-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {getMonthDisplayLabel(summary.month)}
                    </h2>
                  </div>

                  {summary.representativeEvents.length > 0 ? (
                    <div>
                      <ul className="flex flex-wrap gap-1.5" aria-label="대표 이벤트">
                        {summary.representativeEvents.map((event) => (
                          <li
                            className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-slate-700"
                            key={event.id}
                          >
                            {event.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <dl className="grid grid-cols-3 gap-2 text-sm sm:w-[25rem]">
                  <div className="rounded-md bg-sky-50 px-3 py-2">
                    <dt className="text-xs text-slate-500">활동</dt>
                    <dd className="font-semibold text-slate-900">
                      {summary.activityCount}회
                    </dd>
                  </div>
                  <div className="rounded-md bg-sky-50 px-3 py-2">
                    <dt className="text-xs text-slate-500">참여 인원</dt>
                    <dd className="font-semibold text-slate-900">
                      {summary.participantMemberCount}명
                    </dd>
                  </div>
                  <div className="rounded-md bg-sky-50 px-3 py-2">
                    <dt className="text-xs text-slate-500">총 참여 횟수</dt>
                    <dd className="font-semibold text-slate-900">
                      {summary.totalParticipationCount}회
                    </dd>
                  </div>
                </dl>
                <span className="text-lg font-bold text-[var(--brand-strong)] transition group-hover:translate-x-1" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </section>
      ) : null}
    </main>
  );
}
