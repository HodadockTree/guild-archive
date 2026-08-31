"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogout() {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  return <button className="ui-button-secondary" disabled={busy} onClick={async () => { setBusy(true); try { await fetch("/api/admin/session", { method: "DELETE" }); router.refresh(); } finally { setBusy(false); } }} type="button">{busy ? "로그아웃 중…" : "로그아웃"}</button>;
}
