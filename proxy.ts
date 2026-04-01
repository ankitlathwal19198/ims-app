// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = [
  "/login",
  "/favicon.ico",
  "/_next",
  "/api/auth",
  "/sales-order",
];

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/api/")) return true;
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

// Next.js 16: export a function named `proxy`
export const proxy = auth((req: NextRequest & { auth: any }) => {
  const { nextUrl } = req;
  const user = req.auth?.user;

  if (!user && !isPublicPath(nextUrl.pathname)) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set(
      "callbackUrl",
      nextUrl.pathname + nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|login).*)"],
};
