import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import React, { useState, useEffect, useCallback } from "react";

const API_BASE = process.env["EXPO_PUBLIC_API_URL"] || "https://campus-connect-aryan.replit.app/api";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  bio?: string | null;
  college?: string | null;
  program?: string | null;
  year?: number | null;
  phone?: string | null;
  role: string;
  services?: string | null;
  emailVerified?: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  apiRequest: (path: string, options?: RequestInit) => Promise<Response>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
  college?: string;
  collegeId?: string;
  program?: string;
  year?: number;
  phone?: string;
  services?: string[];
  verificationToken?: string;
}

const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("@auth_token");
        const storedUser = await AsyncStorage.getItem("@auth_user");
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {}
      setIsLoading(false);
    };
    loadAuth();
  }, []);

  const apiRequest = useCallback(async (path: string, options: RequestInit = {}): Promise<Response> => {
    const currentToken = token || await AsyncStorage.getItem("@auth_token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };
    if (currentToken) {
      headers["Authorization"] = `Bearer ${currentToken}`;
    }
    return fetch(`${API_BASE}${path}`, { ...options, headers });
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch (e: any) {
      throw new Error(`Network error: ${e?.message || "Cannot reach server"}. URL: ${API_BASE}`);
    }
    let data: any;
    try {
      const text = await res.text();
      data = JSON.parse(text);
    } catch (e: any) {
      throw new Error(`Status ${res.status} — non-JSON response from server (URL: ${API_BASE})`);
    }
    if (!res.ok) throw new Error(data.message || "Invalid email or password");
    setToken(data.token);
    setUser(data.user);
    await AsyncStorage.setItem("@auth_token", data.token);
    await AsyncStorage.setItem("@auth_user", JSON.stringify(data.user));
  }, []);

  const register = useCallback(async (registerData: RegisterData) => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
    } catch {
      throw new Error("Cannot reach the server. Check your internet connection.");
    }
    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error("Server returned an unexpected response. Please try again later.");
    }
    if (!res.ok) throw new Error(data.message || "Registration failed");
    setToken(data.token);
    setUser(data.user);
    await AsyncStorage.setItem("@auth_token", data.token);
    await AsyncStorage.setItem("@auth_user", JSON.stringify(data.user));
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem("@auth_token");
    await AsyncStorage.removeItem("@auth_user");
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    AsyncStorage.setItem("@auth_user", JSON.stringify(updatedUser));
  }, []);

  return { user, token, isLoading, login, register, logout, updateUser, apiRequest };
});

export { AuthProvider, useAuth };
