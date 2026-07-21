"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MonthlyArchiveSummary } from "@/src/lib/monthlyArchive";
import { getMonthDisplayLabel } from "@/src/lib/monthlyArchive";
import { AppHeader } from "@/src/components/ui/AppHeader";
import { MonthlyTrendChart } from "@/src/components/MonthlyTrendChart";
import { DashboardSummaryModal } from "@/src/components/DashboardSummaryModal";

type ServerMonthlyArchiveSummary = MonthlyArchiveSummary & {
  representativeEventTitle: string | null;
};

type ArchiveState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; months: ServerMonthlyArchiveSummary[] };

export default function ArchivePage() {
  const router = useRouter();
  const [archiveState, setArchiveState] = useState<ArchiveState>({
    status: "loading",
  });
  const [participantMonth, setParticipantMonth] = useState<string | null>(null);
  const participantTriggerRef = useRef<HTMLElement | null>(null);

  const openParticipantModal = (month: string, trigger: HTMLElement) => {
    participantTriggerRef.current = trigger;
    setParticipantMonth(month);
  };

  const closeParticipantModal = () => {
    setParticipantMonth(null);
    requestAnimationFrame(() => participantTriggerRef.current?.focus());
  };

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
  const selectedParticipantMonth = monthlySummaries.find(
    (summary) => summary.month === participantMonth,
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
        <section className="grid gap-4 lg:grid-cols-2">
          <MonthlyTrendChart
            description="월별로 기록된 길드 활동 수를 보여줍니다. 막대를 선택하면 해당 월 리포트로 이동합니다."
            emptyMessage="그래프로 표시할 활동 기록이 아직 없습니다."
            interaction="report"
            title="월별 활동 수"
            trends={monthlyTrends}
            unit="회"
            valueKey="activityCount"
          />
          <MonthlyTrendChart
            description="월별로 한 번 이상 함께한 길드원 수를 보여줍니다. 막대를 선택하면 함께한 길드원을 확인할 수 있습니다."
            emptyMessage="그래프로 표시할 참여 기록이 아직 없습니다."
            interaction="members"
            onSelectMembers={openParticipantModal}
            title="월별 함께한 길드원"
            trends={monthlyTrends}
            unit="명"
            valueKey="participantMemberCount"
          />
        </section>
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
          {monthlySummaries.map((summary) => (
            <article
              aria-label={`${getMonthDisplayLabel(summary.month)} 리포트 보기`}
              className="ui-focus-ring group block rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-3 shadow-sm transition hover:border-sky-300 hover:bg-[var(--surface-muted)]"
              key={summary.month}
              onClick={() => router.push(`/viewer?month=${summary.month}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/viewer?month=${summary.month}`);
                }
              }}
              role="link"
              tabIndex={0}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {getMonthDisplayLabel(summary.month)}
                    </h2>
                    {summary.representativeEvents.length > 0 ? (
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
                    ) : null}
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-2 text-sm sm:w-[25rem]">
                  <div className="rounded-md bg-sky-50 px-3 py-2">
                    <dt className="text-xs text-slate-500">활동</dt>
                    <dd className="font-semibold text-slate-900">
                      {summary.activityCount}회
                    </dd>
                  </div>
                  <button
                    aria-label={`${getMonthDisplayLabel(summary.month)} 함께한 길드원 ${summary.participantMemberCount}명 보기`}
                    className="ui-focus-ring rounded-md bg-sky-50 px-3 py-2 text-left transition hover:bg-sky-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      openParticipantModal(summary.month, event.currentTarget);
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                    type="button"
                  >
                    <dt className="text-xs text-slate-500">함께한 길드원</dt>
                    <dd className="font-semibold text-slate-900">
                      {summary.participantMemberCount}명
                    </dd>
                  </button>
                  <div className="rounded-md bg-sky-50 px-3 py-2">
                    <dt className="text-xs text-slate-500">총 참여 횟수</dt>
                    <dd className="font-semibold text-slate-900">
                      {summary.totalParticipationCount}회
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {selectedParticipantMonth ? (
        <DashboardSummaryModal
          onClose={closeParticipantModal}
          title={`${getMonthDisplayLabel(selectedParticipantMonth.month)} 함께한 길드원 ${selectedParticipantMonth.participantMemberCount}명`}
        >
          {(selectedParticipantMonth.participantMembers ?? []).length === 0 ? (
            <p className="rounded-md border border-dashed border-sky-200 bg-sky-50 px-4 py-8 text-center text-sm text-slate-500">
              이 달에 함께한 길드원이 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-sky-100">
              {(selectedParticipantMonth.participantMembers ?? []).map((member) => (
                <li className="flex items-center justify-between gap-4 py-3" key={member.id}>
                  <span className="min-w-0 truncate font-semibold text-slate-900">
                    {member.nickname}
                  </span>
                  <span className="shrink-0 text-sm text-slate-600">
                    참여 {member.participationCount}회 · {member.status === "active" ? "활동중" : "탈퇴"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardSummaryModal>
      ) : null}
    </main>
  );
}
