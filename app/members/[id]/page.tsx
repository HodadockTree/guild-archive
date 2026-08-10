import { notFound } from "next/navigation";
import { MemberProfilePage } from "@/src/components/MemberProfilePage";
import { getMemberProfile } from "@/src/lib/memberProfile";
import { getServerActivities, getServerMembers } from "@/src/lib/serverDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayInKorea() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [activities, members] = await Promise.all([
    getServerActivities(),
    getServerMembers(),
  ]);
  const profile = getMemberProfile(activities, members, id, todayInKorea());

  if (!profile) notFound();

  return <MemberProfilePage profile={profile} />;
}
