import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutoSignIn } from "./AutoSignIn";

export const metadata = { title: "Iniciando sesión..." };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  // Ya autenticado: ir directamente al destino
  if (session?.user) redirect(params.callbackUrl ?? "/home");

  // Error de OAuth: mostrar pantalla con botón manual (evita bucle)
  if (params.error) {
    return <AutoSignIn callbackUrl={params.callbackUrl ?? "/home"} error={params.error} />;
  }

  // Flujo normal: redirigir al route handler que llama signIn() sin problemas de CSRF
  redirect(`/api/auth/login?callbackUrl=${encodeURIComponent(params.callbackUrl ?? "/home")}`);
}
