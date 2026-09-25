import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/eop-session";

// Ends this device's access to whichever plan it was signed in to: the signed
// session cookie is httpOnly, so only the server can clear it. Needs no
// authentication — clearing a cookie can't expose anything.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
