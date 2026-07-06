import { getDb } from "@/src/lib/serverDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getDb().prepare("SELECT 1").get();

    return Response.json({
      ok: true,
      db: "connected",
    });
  } catch {
    return Response.json(
      {
        ok: false,
        db: "disconnected",
      },
      { status: 500 },
    );
  }
}
