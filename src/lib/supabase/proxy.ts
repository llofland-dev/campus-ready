import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Only guards /admin routes — the public /plan/[code] side of the app has
// its own gate (org code + password, see lib/eop-session.ts) and never
// touches Supabase Auth at all.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if expired. Required for Server Components, which
  // can't write cookies themselves.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = [
    "/admin/login",
    "/admin/signup",
    "/admin/forgot-password",
    "/admin/reset-password",
  ].includes(request.nextUrl.pathname);

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
