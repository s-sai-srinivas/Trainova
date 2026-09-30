import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /trainer and /client routes
  const isTrainerRoute = pathname.startsWith("/trainer");
  const isClientRoute = pathname.startsWith("/client");

  if (isTrainerRoute || isClientRoute) {
    const sessionCookie = request.cookies.get("session")?.value;

    if (!sessionCookie) {
      // No session cookie, redirect to login page
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyJWT(sessionCookie);

    if (!payload) {
      // Invalid token, redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.set("session", "", { path: "/", maxAge: 0 });
      return response;
    }

    // Role-based authorization redirects
    if (isTrainerRoute && payload.role !== "TRAINER") {
      // Client trying to access trainer dashboard -> redirect to client dashboard
      return NextResponse.redirect(new URL("/client/today", request.url));
    }

    if (isClientRoute && payload.role !== "CLIENT") {
      // Trainer trying to access client dashboard -> redirect to trainer dashboard
      return NextResponse.redirect(new URL("/trainer/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - invite (invite acceptance pages)
     * - login (login pages)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|invite|login).*)",
  ],
};
