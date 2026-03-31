"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword as changePasswordService, listenAuth, listUsers, signIn as signInService, signOut as signOutService } from "@/lib/data-service";
import { auth } from "@/lib/firebase";
import { AppUser } from "@/lib/types";

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = listenAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    const nextUser = await signInService(email, password);
    setUser(nextUser);
    setLoading(false);
    router.push("/dashboard");
  }

  async function signOut() {
    await signOutService();
    setUser(null);
    router.push("/login");
  }

  async function refreshUser() {
    const users = await listUsers();
    const email = auth?.currentUser?.email;
    if (!email) return;
    const latest = users.find((item) => item.email === email);
    if (latest) {
      setUser(latest);
    }
  }

  async function changePassword(currentPassword: string, nextPassword: string) {
    await changePasswordService(currentPassword, nextPassword);
  }

  return <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser, changePassword }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
