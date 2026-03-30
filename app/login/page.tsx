"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/loading-screen";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  if (loading) {
    return <LoadingScreen label="ログイン状態を確認しています..." />;
  }

  return (
    <div className="center-screen">
      <LoginForm />
    </div>
  );
}
