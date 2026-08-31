import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE, createAdminSession, verifyAdminPassword } from "@/src/lib/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ ok: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!(await verifyAdminPassword(password))) return Response.json({ ok: false, error: "관리자 비밀번호가 올바르지 않습니다." }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, await createAdminSession(), { httpOnly: true, maxAge: ADMIN_SESSION_MAX_AGE, path: "/", sameSite: "strict", secure: process.env.NODE_ENV === "production" });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/", sameSite: "strict", secure: process.env.NODE_ENV === "production" });
  return response;
}
