import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/config";

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request) {
  const { pathname } = request.nextUrl;
  // Keep OG endpoints language-neutral; report HTML is excluded by the matcher.
  if (pathname === "/og" || pathname.startsWith("/og/")) return NextResponse.next();
  return handleI18nRouting(request);
}

export const config = {
  // Preserve dotted model ids such as GLM-5.3-Flash while skipping static files.
  matcher: ["/((?!api|_next|.*\\.(?:avif|css|gif|ico|jpe?g|js|json|png|svg|txt|webp|webmanifest|woff2?|xml|html)$).*)"],
};
