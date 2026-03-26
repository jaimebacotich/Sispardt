export type Role =
  | "admin_general"
  | "responsable_registro"
  | "tecnico_registro"
  | "responsable_estadistica"
  | "recepcionista";

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
    error?: "RefreshTokenExpired";
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
    error?: "RefreshTokenExpired";
  }
}
