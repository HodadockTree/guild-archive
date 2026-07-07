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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-5 py-10">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-neutral-500">
              월별 활동 아카이브
            </p>
            <h1 className="text-3xl font-bold text-neutral-950">
              냥춘 활동 아카이브
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="w-fit rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              href="/"
            >
              홈 대시보드
            </Link>
            <Link
              className="w-fit rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-950"
              href="/admin"
            >
              관리 화면
            </Link>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-neutral-600">
          서버 DB에 가져온 활동 기록을 월별로 모아 월간 리포트로 이동할 수 있습니다.
        </p>
      </header>

      <p className="rounded-md bg-neutral-100 px-4 py-3 text-sm leading-6 text-neutral-600">
        이 화면은 Cloudflare D1 서버 DB 기준으로 표시됩니다. 관리 화면의 기존 입력/수정/삭제는
        계속 현재 브라우저의 LocalStorage 데이터를 사용합니다.
      </p>

      {archiveState.status === "loading" ? (
        <section className="rounded-md border border-neutral-200 bg-white px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-neutral-950">
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
        <section className="rounded-md border border-dashed border-neutral-300 bg-white px-5 py-10 text-center">
          <h2 className="text-lg font-semibold text-neutral-950">
            서버 DB에 표시할 활동 기록이 없습니다.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-500">
            관리 화면에서 기존 JSON 백업 파일을 서버 DB로 가져오면 월별 아카이브가
            표시됩니다.
          </p>
        </section>
      ) : null}

      {archiveState.status === "success" && monthlySummaries.length > 0 ? (
        <section className="grid gap-4">
          {monthlySummaries.map((summary) => (
            <Link
              className="block rounded-md border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-900 hover:shadow-md"
              href={`/viewer?month=${summary.month}`}
              key={summary.month}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">
                      {summary.month}
                    </p>
                    <h2 className="text-2xl font-bold text-neutral-950">
                      {getMonthDisplayLabel(summary.month)}
                    </h2>
                  </div>

                  {summary.representativeEvents.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-neutral-500">
                        대표 이벤트
                      </p>
                      <ul className="mt-1 flex flex-wrap gap-2">
                        {summary.representativeEvents.map((event) => (
                          <li
                            className="rounded-sm bg-neutral-100 px-2 py-1 text-xs text-neutral-700"
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
                  <div className="rounded-md bg-neutral-100 px-3 py-3">
                    <dt className="text-xs text-neutral-500">활동 수</dt>
                    <dd className="font-semibold text-neutral-950">
                      {summary.activityCount}개
                    </dd>
                  </div>
                  {summary.eventCount > 0 ? (
                    <div className="rounded-md bg-neutral-100 px-3 py-3">
                      <dt className="text-xs text-neutral-500">이벤트 수</dt>
                      <dd className="font-semibold text-neutral-950">
                        {summary.eventCount}개
                      </dd>
                    </div>
                  ) : null}
                  <div className="rounded-md bg-neutral-100 px-3 py-3">
                    <dt className="text-xs text-neutral-500">참여 길드원</dt>
                    <dd className="font-semibold text-neutral-950">
                      {summary.participantMemberCount}명
                    </dd>
                  </div>
                  <div className="rounded-md bg-neutral-100 px-3 py-3">
                    <dt className="text-xs text-neutral-500">총 참여 횟수</dt>
                    <dd className="font-semibold text-neutral-950">
                      {summary.totalParticipationCount}회
                    </dd>
                  </div>
                </dl>
              </div>

              <span className="mt-4 inline-flex rounded-md bg-neutral-950 px-3 py-2 text-sm font-semibold text-white">
                월간 리포트 보기
              </span>
            </Link>
          ))}
        </section>
      ) : null}
    </main>
  );
}
