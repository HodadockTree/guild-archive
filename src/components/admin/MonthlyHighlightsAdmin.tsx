"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { MonthlyHighlight, MonthlyHighlightCategory } from "@/src/types";
import {
  monthlyHighlightCategoryBadgeClasses,
  monthlyHighlightCategories,
  monthlyHighlightCategoryLabels,
  validateMonthlyHighlightInput,
} from "@/src/lib/monthlyHighlights";

const TOKEN_SESSION_KEY = "guild-archive:monthly-highlights-admin-token";
type Status =
  | { type: "idle" }
  | { type: "loading" | "success" | "error"; message: string };

function currentMonth() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year}년 ${Number(monthNumber)}월`;
}

export function MonthlyHighlightsAdmin({ isActive }: { isActive: boolean }) {
  const [month, setMonth] = useState(currentMonth);
  const [category, setCategory] = useState<MonthlyHighlightCategory>("game_update");
  const [title, setTitle] = useState("");
  const [dateText, setDateText] = useState("");
  const [description, setDescription] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [tokenReady, setTokenReady] = useState(false);
  const [highlights, setHighlights] = useState<MonthlyHighlight[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const resetForm = useCallback(() => {
    setCategory("game_update");
    setTitle("");
    setDateText("");
    setDescription("");
    setEditingId(null);
    setIsFormOpen(false);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const storedToken = window.sessionStorage.getItem(TOKEN_SESSION_KEY);
      if (storedToken) {
        setAdminToken(storedToken);
        setTokenReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const loadHighlights = useCallback(async (targetMonth: string, token: string) => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setTokenReady(false);
      setStatus({ type: "error", message: "월별 주요 기록을 관리하려면 관리자 토큰을 입력해 주세요." });
      return;
    }

    setStatus({ type: "loading", message: "주요 기록을 불러오는 중입니다." });
    try {
      const response = await fetch(
        `/api/admin/monthly-highlights?month=${encodeURIComponent(targetMonth)}`,
        { headers: { Authorization: `Bearer ${trimmedToken}` }, cache: "no-store" },
      );
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        highlights?: MonthlyHighlight[];
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "주요 기록을 불러오지 못했습니다.");
      }

      setHighlights(result.highlights ?? []);
      setTokenReady(true);
      window.sessionStorage.setItem(TOKEN_SESSION_KEY, trimmedToken);
      setStatus({ type: "idle" });
    } catch (error) {
      setHighlights([]);
      if (error instanceof Error && error.message === "인증에 실패했습니다.") {
        window.sessionStorage.removeItem(TOKEN_SESSION_KEY);
        setTokenReady(false);
      }
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "주요 기록을 불러오지 못했습니다.",
      });
    }
  }, []);

  useEffect(() => {
    if (!isActive || !tokenReady) return;
    const timerId = window.setTimeout(() => {
      void loadHighlights(month, adminToken);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [adminToken, isActive, loadHighlights, month, tokenReady]);

  const requestHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken.trim()}`,
  });

  const handleTokenSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadHighlights(month, adminToken);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let input;
    try {
      input = validateMonthlyHighlightInput({ month, category, title, dateText, description });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "입력값을 확인해 주세요." });
      return;
    }

    setStatus({ type: "loading", message: editingId ? "주요 기록을 수정하는 중입니다." : "주요 기록을 추가하는 중입니다." });
    try {
      const response = await fetch(
        editingId ? `/api/admin/monthly-highlights/${encodeURIComponent(editingId)}` : "/api/admin/monthly-highlights",
        { method: editingId ? "PUT" : "POST", headers: requestHeaders(), body: JSON.stringify(input) },
      );
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "주요 기록을 저장하지 못했습니다.");
      }

      const message = editingId ? "주요 기록을 수정했습니다." : "주요 기록을 추가했습니다.";
      resetForm();
      await loadHighlights(month, adminToken);
      setStatus({ type: "success", message });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "주요 기록을 저장하지 못했습니다." });
    }
  };

  const handleEdit = (highlight: MonthlyHighlight) => {
    setCategory(highlight.category);
    setTitle(highlight.title);
    setDateText(highlight.dateText ?? "");
    setDescription(highlight.description ?? "");
    setEditingId(highlight.id);
    setIsFormOpen(true);
    setStatus({ type: "idle" });
  };

  const handleDelete = async (highlight: MonthlyHighlight) => {
    if (!window.confirm(`"${highlight.title}" 주요 기록을 삭제할까요?`)) return;
    setStatus({ type: "loading", message: "주요 기록을 삭제하는 중입니다." });
    try {
      const response = await fetch(`/api/admin/monthly-highlights/${encodeURIComponent(highlight.id)}`, {
        method: "DELETE",
        headers: requestHeaders(),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "주요 기록을 삭제하지 못했습니다.");
      if (editingId === highlight.id) resetForm();
      setHighlights((items) => items.filter((item) => item.id !== highlight.id));
      setStatus({ type: "success", message: "주요 기록을 삭제했습니다." });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "주요 기록을 삭제하지 못했습니다." });
    }
  };

  return (
    <section className="space-y-4" data-admin-panel="highlights">
      <div>
        <h2 className="ui-section-title">월별 주요 기록 관리</h2>
        <p className="ui-supporting-text">월을 선택해 기존 기록을 확인하고 필요한 기록만 추가하거나 수정합니다.</p>
      </div>

      <div className="ui-surface ui-surface-section space-y-4">
        <label className="ui-form-field max-w-xs">
          <span>대상 월</span>
          <input className="ui-form-control" type="month" value={month} onChange={(event) => {
            setMonth(event.target.value);
            resetForm();
          }} required />
        </label>

        {!tokenReady ? (
          <form className="space-y-3" onSubmit={handleTokenSubmit}>
            <p className="ui-supporting-text">이 브라우저 탭을 닫을 때까지만 관리자 토큰을 기억합니다.</p>
            <label className="ui-form-field max-w-md">
              <span>관리자 토큰</span>
              <input autoComplete="off" className="ui-form-control" placeholder="ADMIN_IMPORT_TOKEN 값 입력" type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
            </label>
            <button className="ui-button-primary" disabled={status.type === "loading"} type="submit">인증하고 기록 조회</button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="ui-card-title">등록된 주요 기록 {highlights.length}건</h3>
              <p className="ui-caption">{monthLabel(month)} 기준</p>
            </div>
            <button className="ui-button-primary" type="button" onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}>+ 주요 기록 추가</button>
          </div>
        )}

        {status.type !== "idle" ? (
          <p className={`rounded-md px-3 py-2 text-sm ${status.type === "error" ? "bg-red-50 text-[var(--danger)]" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}>
            {status.message}
          </p>
        ) : null}

        {tokenReady && status.type !== "loading" ? highlights.length === 0 ? (
          <p className="ui-empty-state">{monthLabel(month)}에 등록된 주요 기록이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {highlights.map((highlight) => (
              <li className="py-4" key={highlight.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs ${monthlyHighlightCategoryBadgeClasses[highlight.category]}`}>{monthlyHighlightCategoryLabels[highlight.category]}</span>
                      {highlight.dateText ? <span className="ui-caption">{highlight.dateText}</span> : null}
                    </div>
                    <h3 className="ui-card-title mt-2">{highlight.title}</h3>
                    {highlight.description ? <p className="ui-body-text mt-1 line-clamp-2 whitespace-pre-wrap">{highlight.description}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="ui-button-secondary" type="button" onClick={() => handleEdit(highlight)}>수정</button>
                    <button className="ui-button-danger" type="button" onClick={() => handleDelete(highlight)}>삭제</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {tokenReady && isFormOpen ? (
        <form className="ui-surface ui-surface-section space-y-4" onSubmit={handleSubmit}>
          <div>
            <h3 className="ui-card-title">{editingId ? `${title || "선택한 주요 기록"} 수정 중` : "주요 기록 추가"}</h3>
            <p className="ui-supporting-text">대상 월: {monthLabel(month)}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="ui-form-field"><span>구분</span><select className="ui-form-control" value={category} onChange={(event) => setCategory(event.target.value as MonthlyHighlightCategory)}>{monthlyHighlightCategories.map((value) => <option key={value} value={value}>{monthlyHighlightCategoryLabels[value]}</option>)}</select></label>
            <label className="ui-form-field"><span>날짜·기간</span><input className="ui-form-control" maxLength={80} placeholder="예: 7월 1일~7월 14일" value={dateText} onChange={(event) => setDateText(event.target.value)} /></label>
          </div>
          <label className="ui-form-field"><span>제목</span><input className="ui-form-control" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label className="ui-form-field"><span>한 줄 설명</span><textarea className="ui-form-control min-h-20 resize-y" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
          <div className="flex flex-wrap gap-2">
            <button className="ui-button-primary" disabled={status.type === "loading"} type="submit">{editingId ? "주요 기록 수정" : "주요 기록 추가"}</button>
            <button className="ui-button-ghost" type="button" onClick={resetForm}>취소</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
