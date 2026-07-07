"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MonthlyArchiveSummary } from "@/src/lib/monthlyArchive";
import { getMonthDisplayLabel } from "@/src/lib/monthlyArchive";

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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 bg-sky-50 px-5 py-10 text-slate-800">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-sky-700">
              월별 활동 아카이브
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              냥춘 활동 아카이브
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="w-fit rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 transition hover:border-sky-400 hover:bg-sky-50"
              href="/"
            >
              홈 대시보드
            </Link>
            <Link
              className="w-fit rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
              href="/admin"
            >
              관리 화면
            </Link>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          월별로 모인 활동 기록을 살펴보고, 원하는 달의 리포트로 이동할 수 있습니다.
        </p>
      </header>

      {archiveState.status === "loading" ? (
        <section className="rounded-md border border-sky-100 bg-white px-5 py-10 text-center shadow-sm shadow-sky-100/60">
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
        <section className="grid gap-4">
          {monthlySummaries.map((summary) => (
            <Link
              className="block rounded-md border border-sky-100 bg-white p-5 shadow-sm shadow-sky-100/60 transition hover:border-sky-300 hover:shadow-md"
              href={`/viewer?month=${summary.month}`}
              key={summary.month}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-sky-700">
                      {summary.month}
                    </p>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {getMonthDisplayLabel(summary.month)}
                    </h2>
                  </div>

                  {summary.representativeEvents.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        대표 이벤트
                      </p>
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {summary.representativeEvents.map((event) => (
                          <li
                            className="rounded-sm bg-sky-100 px-2 py-1 text-xs text-sky-700"
                            key={event.id}
                          >
                            {event.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <dl className="grid shrink-0 grid-cols-2 gap-2 text-sm sm:w-72">
                  <div className="rounded-md bg-sky-50 px-3 py-3">
                    <dt className="text-xs text-slate-500">활동 수</dt>
                    <dd className="font-semibold text-slate-900">
                      {summary.activityCount}개
                    </dd>
                  </div>
                  {summary.eventCount > 0 ? (
                    <div className="rounded-md bg-sky-50 px-3 py-3">
                      <dt className="text-xs text-slate-500">이벤트 수</dt>
                      <dd className="font-semibold text-slate-900">
                        {summary.eventCount}개
                      </dd>
                    </div>
                  ) : null}
                  <div className="rounded-md bg-sky-50 px-3 py-3">
                    <dt className="text-xs text-slate-500">함께한 인원</dt>
                    <dd className="font-semibold text-slate-900">
                      {summary.participantMemberCount}명
                    </dd>
                  </div>
                  <div className="rounded-md bg-sky-50 px-3 py-3">
                    <dt className="text-xs text-slate-500">총 참여 횟수</dt>
                    <dd className="font-semibold text-slate-900">
                      {summary.totalParticipationCount}회
                    </dd>
                  </div>
                </dl>
              </div>

              <span className="mt-4 inline-flex rounded-md bg-sky-500 px-3 py-2 text-sm font-semibold text-white">
                월간 리포트 보기
              </span>
            </Link>
          ))}
        </section>
      ) : null}
    </main>
  );
}
