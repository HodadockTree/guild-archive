import { cookies } from "next/headers";
import { AdminLogin } from "@/src/components/admin/AdminLogin";
import { AdminLogout } from "@/src/components/admin/AdminLogout";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/src/lib/serverAuth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSession(session))) return <AdminLogin />;
  return <><div className="mx-auto flex w-full max-w-6xl justify-end px-4 pt-4 sm:px-6"><AdminLogout /></div>{children}</>;
}
