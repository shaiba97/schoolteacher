import { NextResponse } from "next/server";
import { getProxySession, teacherApiUrl, TeacherSessionError } from "@/lib/api/session";

export const runtime = "nodejs";

/**
 * Exchanges the httpOnly session cookies for a short-lived socket ticket.
 * The session JWT itself never reaches JS — the ticket is audience-scoped to
 * `socket` and expires in 600 seconds, so it is useless for REST calls and
 * worthless long before it can be replayed far.
 */
export async function GET(request: Request) {
  let session: { authorization: string; tenantId: string };
  try {
    session = await getProxySession(request);
  } catch (error) {
    if (error instanceof TeacherSessionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }

  let upstream: Response;
  try {
    upstream = await fetch(teacherApiUrl("/teachers/me/socket-ticket"), {
      headers: {
        Accept: "application/json",
        Authorization: session.authorization,
        "X-Tenant-Id": session.tenantId,
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Teacher API is unavailable" }, { status: 502 });
  }
  if (!upstream.ok) {
    const data = await upstream.json().catch(() => undefined);
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : "Could not issue a socket ticket";
    return NextResponse.json({ message }, { status: upstream.status });
  }
  return NextResponse.json(await upstream.json());
}
