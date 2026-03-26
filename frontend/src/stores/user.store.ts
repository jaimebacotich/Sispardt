import { create } from "zustand";
import type { Role, UserSession } from "@/types/auth";

interface UserStore {
  user: UserSession | null;
  setUser: (user: UserSession | null) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// Selectores
export const selectRoles = (s: UserStore): Role[] => s.user?.roles ?? [];
export const selectEstablecimientoId = (s: UserStore): string | null =>
  s.user?.establecimientoId ?? null;
