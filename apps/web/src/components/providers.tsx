"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { ConfirmProvider } from "@/components/confirm-dialog";
import { Toaster } from "@/components/ui/sonner";
import { api, setToken, getToken, TOKEN_KEY } from "@/lib/api";
import type { User } from "@/types/domain";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ status: "signed-in"; user: User } | { status: "setup"; email: string }>;
  startEmailLink: (
    username: string,
    password: string,
    address: string,
  ) => Promise<{ email: string; previewCode: string | null }>;
  confirmLogin: (username: string, code: string) => Promise<{ setupToken: string }>;
  completePassword: (setupToken: string, password: string) => Promise<User>;
  refresh: () => Promise<void>;
  register: (input: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ status: "created"; user: User } | { status: "verify"; email: string; previewCode: string | null }>;
  confirmRegister: (username: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function dropSession() {
    setToken(null);
    setUser(null);
    queryClient.clear();
  }

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== TOKEN_KEY) return;
      if (!event.newValue) {
        setUser(null);
        queryClient.clear();
        return;
      }
      api<{ user: User }>("/api/auth/me")
        .then((data) => setUser(data.user))
        .catch(() => {
          setToken(null);
          setUser(null);
        });
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  async function login(username: string, password: string) {
    dropSession();
    const data = await api<{ token: string; user: User } | { setupRequired: true; email: string }>("/api/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ username, password }),
    });
    if ("setupRequired" in data) {
      return { status: "setup" as const, email: data.email };
    }
    setToken(data.token);
    setUser(data.user);
    return { status: "signed-in" as const, user: data.user };
  }

  async function startEmailLink(username: string, password: string, address: string) {
    return api<{ verificationRequired: true; email: string; previewCode: string | null }>("/api/auth/login/link", {
      method: "POST",
      body: JSON.stringify({ username, password, address }),
    });
  }

  async function confirmLogin(username: string, code: string) {
    return api<{ passwordRequired: true; setupToken: string }>("/api/auth/login/verify", {
      method: "POST",
      body: JSON.stringify({ username, code }),
    });
  }

  async function completePassword(setupToken: string, password: string) {
    const data = await api<{ token: string; user: User }>("/api/auth/login/password", {
      method: "POST",
      body: JSON.stringify({ setupToken, password }),
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(input: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    phone: string;
    password: string;
  }) {
    dropSession();
    const data = await api<
      { token: string; user: User } | { verificationRequired: true; email: string; previewCode: string | null }
    >("/api/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ ...input, email: input.email || undefined }),
    });
    if ("verificationRequired" in data) {
      return { status: "verify" as const, email: data.email, previewCode: data.previewCode };
    }
    setToken(data.token);
    setUser(data.user);
    return { status: "created" as const, user: data.user };
  }

  async function confirmRegister(username: string, code: string) {
    const data = await api<{ token: string; user: User }>("/api/auth/register/verify", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ username, code }),
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function refresh() {
    if (!getToken()) return;
    const data = await api<{ user: User }>("/api/auth/me");
    setUser(data.user);
  }

  async function logout() {
    const token = getToken();
    dropSession();
    if (!token) return;
    try {
      await api("/api/auth/logout", {
        method: "POST",
        auth: false,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // The browser session is already cleared.
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, startEmailLink, confirmLogin, completePassword, register, confirmRegister, logout, refresh }}>{children}</AuthContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthProvider>
          <ConfirmProvider>
            {children}
            <Toaster position="top-right" />
          </ConfirmProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
