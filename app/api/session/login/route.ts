import { NextResponse } from "next/server";
import { teacherApiUrl, TEACHER_TENANT_COOKIE, TEACHER_TOKEN_COOKIE } from "@/lib/api/session";

export const runtime = "nodejs";

type Membership = {
  tenantId: string;
  status: string;
  tenant: { id: string; name: string };
  roles: Array<{ slug: string }>;
};

type LoginResponse = {
  accessToken: string;
  memberships: Membership[];
};

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function sessionCookies(token: string, tenantId: string) {
  const secure = process.env.NODE_ENV === "production";
  const base = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure ? "; Secure" : ""}`;
  return [
    `${TEACHER_TOKEN_COOKIE}=${encodeURIComponent(token)}; ${base}`,
    `${TEACHER_TENANT_COOKIE}=${encodeURIComponent(tenantId)}; ${base}`,
  ];
}

/**
 * Teacher login. Accounts are provisioned by academic affairs — there is no
 * self-signup surface. The caller must hold a TEACHER-role membership;
 * when several schools match, the frontend re-posts with an explicit tenantId.
 */
export async function POST(request: Request) {
  let body: { identifier?: string; password?: string; tenantId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }
  const identifier = body.identifier?.trim() ?? "";
  const password = body.password ?? "";
  if (!identifier || !password) {
    return NextResponse.json({ message: "Employee ID and password are required" }, { status: 400 });
  }

  // Teacher sign in is employee-ID only. The tenant must be known up front:
  // IDs are unique per school, and unlike the phone flow there is no
  // ambiguity recovery — an ID resolves to exactly one teacher or none.
  const tenantId = body.tenantId ?? process.env.NEXT_PUBLIC_TENANT_ID ?? "";
  if (!tenantId) {
    return NextResponse.json(
      { message: "This school is not configured for employee-ID sign in — contact academic affairs" },
      { status: 400 },
    );
  }

  const payload: Record<string, string> = {
    tenantId,
    employeeNumber: identifier,
  };
  payload.password = password;

  let upstream: Response;
  try {
    upstream = await fetch(teacherApiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
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
        : "Sign in failed";
    return NextResponse.json({ message }, { status: upstream.status });
  }

  const data = (await upstream.json()) as LoginResponse;
  const teacherMemberships = (data.memberships ?? []).filter(
    (m) => m.status === "ACTIVE" && m.roles.some((r) => r.slug === "TEACHER"),
  );
  if (teacherMemberships.length === 0) {
    return NextResponse.json(
      { message: "This account has no teacher access — accounts are provisioned by academic affairs" },
      { status: 403 },
    );
  }
  if (teacherMemberships.length > 1 && !body.tenantId) {
    return NextResponse.json(
      {
        message: "Select your school",
        tenants: teacherMemberships.map((m) => ({ id: m.tenantId, name: m.tenant.name })),
      },
      { status: 409 },
    );
  }
  const membership =
    teacherMemberships.find((m) => m.tenantId === body.tenantId) ?? teacherMemberships[0];

  const response = NextResponse.json({
    ok: true,
    tenant: { id: membership.tenantId, name: membership.tenant.name },
  });
  for (const cookie of sessionCookies(data.accessToken, membership.tenantId)) {
    response.headers.append("Set-Cookie", cookie);
  }
  return response;
}
