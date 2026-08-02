import { create } from "zustand";
import type { MemberResponse } from "@/types/dto";

interface AuthState {
  member: MemberResponse | null;
  token: string | null;
  setAuth: (token: string, member: MemberResponse) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  member: null,
  token: localStorage.getItem("access_token"),
  setAuth: (token, member) => {
    localStorage.setItem("access_token", token);
    set({ token, member });
  },
  clearAuth: () => {
    localStorage.removeItem("access_token");
    set({ token: null, member: null });
  },
}));
