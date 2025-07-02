import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authApi, tokenStorage } from "@/lib/auth";
import type { User, LoginRequest, RegisterRequest, ChangePasswordRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<any>;
  register: (userData: RegisterRequest) => Promise<any>;
  logout: () => void;
  changePassword: (passwordData: ChangePasswordRequest) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: authApi.getMe,
    enabled: !!tokenStorage.get() && isInitialized,
    retry: false,
  });

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      tokenStorage.set(data.token);
      queryClient.setQueryData(["/api/auth/me"], data.user);
      setLocation("/dashboard");
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      tokenStorage.set(data.token);
      queryClient.setQueryData(["/api/auth/me"], data.user);
      setLocation("/dashboard");
      toast({
        title: "Account created!",
        description: "Welcome to Health Data Harvest.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Unable to create account",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been successfully changed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message || "Unable to change password",
        variant: "destructive",
      });
    },
  });

  const logout = () => {
    tokenStorage.remove();
    queryClient.clear();
    setLocation("/login");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const value: AuthContextType = {
    user: user || null,
    isLoading: isLoading && !!tokenStorage.get(),
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    changePassword: changePasswordMutation.mutateAsync,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}