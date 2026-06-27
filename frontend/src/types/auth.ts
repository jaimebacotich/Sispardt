export type Role =
  | "admin_general"
  | "responsable_registro"
  | "tecnico_registro"
  | "responsable_estadistica"
  | "recepcionista"
  | "estadistica_externa"
  | "migraciones";

export interface UserSession {
  sub: string;
  username: string;
  fullName: string;
  email: string;
  roles: Role[];
  establecimientoId: string | null;
  accessToken: string;
}

declare module "next-auth" {
  interface Session {
    user: UserSession;
    error?: "RefreshAccessTokenError";
  }
  interface JWT {
    sub: string;
    username: string;
    fullName: string;
    email: string;
    roles: Role[];
    establecimientoId: string | null;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    error?: "RefreshAccessTokenError";
  }
}
