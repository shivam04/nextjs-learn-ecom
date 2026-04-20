import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

// Edge-safe auth config: no Prisma, no adapter, no Node-only deps.
// Used by middleware.ts so the Edge bundle stays under 1 MB.
export const authConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Providers are declared in the main auth.ts (which runs on Node).
  // Middleware only needs the `authorized` callback to gate access.
  providers: [],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authorized({ request, auth }: any) {
      const protectedPaths = [
        /\/shipping-address/,
        /\/payment-method/,
        /\/place-order/,
        /\/profile/,
        /\/user\/(.*)/,
        /\/order\/(.*)/,
        /\/admin/,
      ];

      const { pathname } = request.nextUrl;

      if (!auth && protectedPaths.some((p) => p.test(pathname))) {
        return false;
      }

      if (!request.cookies.get("sessionCartId")) {
        const sessionCartId = crypto.randomUUID();
        const newRequestHeaders = new Headers(request.headers);
        const response = NextResponse.next({
          request: { headers: newRequestHeaders },
        });
        response.cookies.set("sessionCartId", sessionCartId);
        return response;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
