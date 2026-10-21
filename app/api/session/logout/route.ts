import { NextResponse } from "next/server";
import { TEACHER_TENANT_COOKIE, TEACHER_TOKEN_COOKIE } from "@/lib/api/session";

export const runtime = "nodejs";

function clearCookieHeader(name: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", clearCookieHeader(TEACHER_TOKEN_COOKIE));
  response.headers.append("Set-Cookie", clearCookieHeader(TEACHER_TENANT_COOKIE));
  return response;
}
