import Link from "next/link";
import { AppHeader } from "@/src/components/ui/AppHeader";

export default function NotFound() {
  return (
    <main className="app-shell">
      <AppHeader
        currentPath="/members"
        description="주소를 다시 확인하거나 길드원 목록에서 기록을 선택해 주세요."
        eyebrow="길드원 개인 활동 기록"
        title="길드원을 찾을 수 없습니다"
      />
      <section className="rounded-md border border-sky-100 bg-white px-5 py-10 text-center">
        <p className="text-sm text-slate-600">
          존재하지 않거나 더 이상 확인할 수 없는 길드원 id입니다.
        </p>
        <Link
          className="ui-focus-ring mt-4 inline-flex rounded-md border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-strong)] hover:bg-sky-50"
          href="/"
        >
          길드원 목록으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
