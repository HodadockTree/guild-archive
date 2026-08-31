"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "로그인하지 못했습니다.");
      setPassword(""); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "로그인하지 못했습니다."); }
    finally { setIsSubmitting(false); }
  }

  return <main className="app-shell"><section className="ui-surface ui-surface-section mx-auto w-full max-w-md space-y-5"><div className="space-y-2"><p className="text-sm font-medium text-[var(--text-secondary)]">냥춘 길드 활동 아카이브</p><h1 className="ui-page-title">관리자 로그인</h1><p className="ui-supporting-text">관리자 비밀번호를 입력해 관리 화면에 접속하세요.</p></div><form className="space-y-4" onSubmit={handleSubmit}><label className="ui-form-field"><span>관리자 비밀번호</span><input autoComplete="current-password" autoFocus className="ui-form-control" disabled={isSubmitting} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>{error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-[var(--danger)]" role="alert">{error}</p> : null}<button className="ui-button-primary w-full" disabled={isSubmitting} type="submit">{isSubmitting ? "로그인 중…" : "로그인"}</button></form></section></main>;
}
