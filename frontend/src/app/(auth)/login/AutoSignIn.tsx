"use client";
import { signIn } from "next-auth/react";
import { useEffect } from "react";

export function AutoSignIn({ callbackUrl, error }: { callbackUrl: string; error?: string }) {
  useEffect(() => {
    if (!error) signIn("keycloak", { callbackUrl });
  }, [callbackUrl, error]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar to-slate-800">
        <div className="bg-card rounded-2xl shadow-2xl p-8 border border-white/10 w-full max-w-sm text-center">
          <p className="text-destructive text-sm mb-4">
            Error de autenticación. Por favor intenta nuevamente.
          </p>
          <button
            onClick={() => signIn("keycloak", { callbackUrl })}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar to-slate-800">
      <p className="text-white/60 text-sm">Redirigiendo a Keycloak...</p>
    </div>
  );
}
