const API_URL = process.env.TEACHER_API_URL || "https://schoolbackend-7n8a.onrender.com/api";

export const TEACHER_AUTH_HEADER = "authorization";
export const TEACHER_TENANT_HEADER = "x-tenant-id";
/** Session cookie names (populated by the login slice; auth comes last). */
export const TEACHER_TOKEN_COOKIE = "tp_token";
export const TEACHER_TENANT_COOKIE = "tp_tenant";

export class TeacherSessionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TeacherSessionError";
    this.status = status;
  }
}

/** Dev bypass mirroring the backend's AUTH_NO_SESSION: unauthenticated local work. */
const NO_SESSION = process.env.TEACHER_NO_AUTH === "true";

export function teacherRequestHeaders(source: Headers) {
  const authorization = source.get(TEACHER_AUTH_HEADER);
  const tenantId = source.get(TEACHER_TENANT_HEADER);

  if (NO_SESSION) {
    return {
      authorization: authorization || "",
      tenantId: tenantId || process.env.NEXT_PUBLIC_TENANT_ID || "",
    };
  }
  if (!authorization) throw new TeacherSessionError("Teacher session is missing", 401);
  if (!tenantId) throw new TeacherSessionError("Teacher tenant is missing", 403);
  return { authorization, tenantId };
}

/**
 * Cookie-first resolution for the browser proxy: the login slice stores the
 * JWT + tenant in httpOnly cookies (invisible to JS), so the proxy route
 * reads them here and forwards them as headers. Direct headers still win
 * when present (server-to-server calls, dev tools).
 */
export async function getProxySession(request: Request) {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const headerAuth = request.headers.get(TEACHER_AUTH_HEADER);
  const headerTenant = request.headers.get(TEACHER_TENANT_HEADER);
  const authorization =
    headerAuth || (jar.get(TEACHER_TOKEN_COOKIE)?.value ? `Bearer ${jar.get(TEACHER_TOKEN_COOKIE)?.value}` : "");
  const tenantId = headerTenant || jar.get(TEACHER_TENANT_COOKIE)?.value || "";
  return teacherRequestHeaders(
    new Headers({
      ...(authorization ? { [TEACHER_AUTH_HEADER]: authorization } : {}),
      ...(tenantId ? { [TEACHER_TENANT_HEADER]: tenantId } : {}),
    }),
  );
}

export async function getIncomingTeacherHeaders() {
  const { headers } = await import("next/headers");
  return teacherRequestHeaders(await headers());
}

export function teacherApiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
