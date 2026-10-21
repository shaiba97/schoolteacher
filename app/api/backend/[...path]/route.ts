import type { NextRequest } from "next/server";
import { getProxySession, teacherApiUrl, TeacherSessionError } from "@/lib/api/session";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path: string[] }> };

function responseHeaders(source: Headers) {
  const headers = new Headers();
  const contentType = source.get("content-type");
  const disposition = source.get("content-disposition");
  if (contentType) headers.set("content-type", contentType);
  if (disposition) headers.set("content-disposition", disposition);
  return headers;
}

async function proxy(request: NextRequest, context: RouteContext) {
  let session: { authorization: string; tenantId: string };
  try {
    session = await getProxySession(request);
  } catch (error) {
    if (error instanceof TeacherSessionError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }

  const { path } = await context.params;
  const target = new URL(teacherApiUrl(`/${path.map((segment) => encodeURIComponent(segment)).join("/")}`));
  target.search = request.nextUrl.search;

  const headers = new Headers();
  headers.set("Accept", request.headers.get("accept") || "application/json");
  if (session.authorization) headers.set("Authorization", session.authorization);
  headers.set("X-Tenant-Id", session.tenantId);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders(upstream.headers),
    });
  } catch {
    return Response.json({ message: "Teacher API is unavailable" }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
