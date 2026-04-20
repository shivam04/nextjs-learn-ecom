import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Initialize NextAuth with the Edge-safe config only.
// This keeps the middleware bundle small (no Prisma, adapter, bcrypt, etc.).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
