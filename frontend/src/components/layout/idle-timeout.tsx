"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

export function IdleTimeout() {
  const { data: session } = useSession();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doLogout = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = await import("next-auth/react").then(m => m.getSession()) as any;
    const idToken = s?.idToken as string | undefined;
    await signOut({ redirect: false });
    const kcPort = process.env.NEXT_PUBLIC_KC_PORT ?? "8080";
    const keycloakIssuer = `${window.location.protocol}//${window.location.hostname}:${kcPort}/realms/sispardt`;
    const redirectUri = encodeURIComponent(`${window.location.origin}/login`);
    const hint = idToken ? `&id_token_hint=${encodeURIComponent(idToken)}` : "";
    window.location.href = `${keycloakIssuer}/protocol/openid-connect/logout?post_logout_redirect_uri=${redirectUri}${hint}`;
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doLogout, IDLE_TIMEOUT_MS);
  }, [doLogout]);

  useEffect(() => {
    if (!session || session.error) return;

    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [session, resetTimer]);

  // Forzar logout si Keycloak rechazó el refresh token
  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      doLogout();
    }
  }, [session?.error, doLogout]);

  return null;
}
