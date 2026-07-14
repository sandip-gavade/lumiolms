import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResult, AuthUser, MembershipRole } from './types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  tenantId: string | null;
  roles: MembershipRole[];
  hydrated: boolean;
  setSession: (result: AuthResult) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenantId: null,
      roles: [],
      hydrated: false,
      setSession: (result) =>
        set({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          tenantId: result.tenantId,
          roles: result.roles,
        }),
      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          tenantId: null,
          roles: [],
        }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'lumio-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export function isLoggedIn(): boolean {
  return Boolean(useAuthStore.getState().accessToken);
}
