import { create, type StateCreator } from "zustand";
import type { User } from "../api/auth/auth.api";
import type { Department } from "../api/auth/department.api";

type AuthState = {
  user: User | null;
  department: Department | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setAuth: (payload: {
    user: User;
    department?: Department | null;
    accessToken: string;
  }) => void;
  clearAuth: () => void;
};

const authStoreCreator: StateCreator<AuthState> = (set) => ({
  user: null,
  department: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: ({
    user,
    department = null,
    accessToken,
  }: {
    user: User;
    department?: Department | null;
    accessToken: string;
  }) =>
    set({
      user,
      department,
      accessToken,
      isAuthenticated: true,
    }),

  clearAuth: () =>
    set({
      user: null,
      department: null,
      accessToken: null,
      isAuthenticated: false,
    }),
});

export const useAuthStore = create<AuthState>(authStoreCreator);