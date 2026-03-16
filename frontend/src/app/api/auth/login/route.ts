import { signIn } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/home";
  await signIn("keycloak", { redirectTo: callbackUrl });
}
