import { notifyTenantLock } from "@/lib/tenant-lock";
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/**
 * Tenant resolution order: explicit argument (server callers) → session
 * cookie set at login (browser; httpOnly, read server-side by the proxy) →
 * build-time env fallback (dev bypass only).
 *
 * Browser callers go through /api/backend with no manual auth headers: the
 * proxy injects Authorization + X-Tenant-Id from the httpOnly session
 * cookies, so the JWT never touches JS.
 */
export function resolveTenantId(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof window !== "undefined") return "";
  const envTenant = process.env.NEXT_PUBLIC_TENANT_ID;
  if (!envTenant) throw new ApiError("Teacher tenant is not configured", 500);
  return envTenant;
}

export async function teacherApiFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: { tenantId?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  if (typeof window === "undefined") {
    const { getIncomingTeacherHeaders } = await import("./session");
    const session = await getIncomingTeacherHeaders();
    const tenantId = opts.tenantId || session.tenantId;
    if (!tenantId) throw new ApiError("Teacher tenant is not configured", 500);
    if (session.authorization) headers.set("Authorization", session.authorization);
    headers.set("X-Tenant-Id", tenantId);
    const { teacherApiUrl } = await import("./session");
    const response = await fetch(teacherApiUrl(path), { ...init, headers, cache: "no-store" });
    return parseResponse<T>(response);
  }

  // Browser: session cookies ride along via credentials:include; the proxy
  // injects Authorization + X-Tenant-Id from the httpOnly cookies.
  const response = await fetch(`/api/backend${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  if (response.status === 401 && window.location.pathname !== "/login") {
    // Hard navigation (not router.push): an expired session must drop all
    // in-memory state before landing on login.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
    throw new ApiError("Session expired — please sign in again", 401);
  }
  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? safeJson(text) : undefined;
  if (!response.ok) {
    const message =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    notifyTenantLock(body);    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
