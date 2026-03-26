import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = ["/login", "/logged-out", "/api/auth", "/_next", "/favicon", "/403"];

export default auth((req) => {
  // En modo mock se omite la verificación de sesión
  if (process.env.NEXT_PUBLIC_MOCK_API === "true") {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Permitir rutas públicas y assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // auth() valida el JWT completo — req.auth es null si la sesión es inválida o expiró
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
