import NextAuth from "next-auth";
import type { Role } from "@/types/auth";

// Separa URL pública (browser→Keycloak) de URL interna (contenedor→Keycloak).
// AUTH_KEYCLOAK_ISSUER      = http://localhost:8080/realms/sispardt  (browser + validación iss en JWT)
// AUTH_KEYCLOAK_INTERNAL    = http://keycloak:8080/realms/sispardt   (token/userinfo/jwks desde contenedor)
const issuer = process.env.AUTH_KEYCLOAK_ISSUER!;
const internal = process.env.AUTH_KEYCLOAK_INTERNAL ?? issuer;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    {
      id: "keycloak",
      name: "Keycloak",
      type: "oidc",
      wellKnown: `${internal}/.well-known/openid-configuration`,
      issuer,
      authorization: {
        url: `${issuer}/protocol/openid-connect/auth`,
        params: { scope: "openid profile email" },
      },
      token: `${internal}/protocol/openid-connect/token`,
      userinfo: `${internal}/protocol/openid-connect/userinfo`,
      jwks_endpoint: `${internal}/protocol/openid-connect/certs`,
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET || undefined,
      checks: ["pkce", "state"],
    },
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 dias cookie
  callbacks: {
    async jwt({ token, account, profile }) {
      // 1. Log in Inicial
      if (account?.access_token) {
        const decodeJwt = (jwt: string) => {
          const b64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
          const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, "=");
          return JSON.parse(Buffer.from(padded, "base64").toString("utf-8")) as Record<string, unknown>;
        };
        const atp = decodeJwt(account.access_token);
        const p = (profile ?? {}) as Record<string, unknown>;
        token.accessToken = account.access_token;
        token.idToken = account.id_token as string;
        token.refreshToken = account.refresh_token as string;
        token.expiresAt = account.expires_at as number; // expires_at esta en segundos (epoch timestamp)
        token.sub = (p.sub ?? atp.sub) as string;
        token.email = (p.email ?? atp.email) as string;
        token.fullName = ((p.name ?? atp.name) as string) ?? "";
        token.username = ((p.preferred_username ?? atp.preferred_username) as string) 
          ?? ((p.email ?? atp.email) as string) 
          ?? "SISPARDT User";

        const rolesClaimString = JSON.stringify(atp.roles || "") + JSON.stringify((atp.realm_access as Record<string, unknown>)?.roles || "");
        const validRoles = [
          "admin_general",
          "responsable_registro",
          "tecnico_registro",
          "responsable_estadistica",
          "recepcionista",
          "estadistica_externa",
          "migraciones",
        ];
        token.roles = validRoles.filter(r => rolesClaimString.includes(r)) as Role[];
        token.establecimientoId = (atp.establecimiento_id as string) ?? null;
        return token;
      }

      // 2. Sesión activa: Revisar si el token de acceso sigue vigente
      const DateNowUnix = Math.floor(Date.now() / 1000);
      if (DateNowUnix < (token.expiresAt as number)) {
        // Aún válido
        return token;
      }

      // 3. Expirado: Intentar Refresh Token
      try {
        console.log("=== REFRESHING TOKEN ===");
        const response = await fetch(`${internal}/protocol/openid-connect/token`, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.AUTH_KEYCLOAK_ID!,
            client_secret: process.env.AUTH_KEYCLOAK_SECRET || "",
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
          method: "POST",
        });

        const tokens = await response.json();

        if (!response.ok) {
          throw tokens;
        }

        // Actualizar el token en la sesión
        // En NextAuth JWT, la expiración de Keycloak viene en expires_in (segundos de vida)
        token.accessToken = tokens.access_token;
        token.expiresAt = DateNowUnix + (tokens.expires_in as number);
        token.refreshToken = tokens.refresh_token ?? token.refreshToken; // Keycloak a veces devuelve nuevo REFRESH token
        
        console.log("Token Refrescado Exitosamente.");
        return token;
      } catch (error) {
        console.error("Error al refrescar el token:", error);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).user = {
        sub: token.sub as string,
        username: (token.username ?? token.sub) as string,
        fullName: (token.fullName ?? "") as string,
        email: (token.email ?? "") as string,
        roles: (token.roles as Role[]) ?? [],
        establecimientoId: (token.establecimientoId ?? null) as string | null,
        accessToken: (token.accessToken ?? "") as string,
      };

      // Inyectar JWT en la raíz para bypass de sanitización
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).accessToken = token.accessToken as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).idToken = token.idToken as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).establecimientoId = (token.establecimientoId ?? null) as string | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).error = token.error as string | undefined;

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
