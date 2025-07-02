import { apiRequest } from "./queryClient";
import type { LoginRequest, RegisterRequest, ChangePasswordRequest, User } from "@shared/schema";

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const res = await apiRequest("POST", "/api/auth/login", credentials);
    return res.json();
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiRequest("POST", "/api/auth/register", userData);
    return res.json();
  },

  changePassword: async (passwordData: ChangePasswordRequest): Promise<void> => {
    await apiRequest("POST", "/api/auth/change-password", passwordData);
  },

  getMe: async (): Promise<User> => {
    const res = await apiRequest("GET", "/api/auth/me");
    return res.json();
  }
};

export const TOKEN_KEY = "health_data_harvest_token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => localStorage.removeItem(TOKEN_KEY),
};
