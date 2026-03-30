"use client";

import { isFirebaseConfigured } from "@/lib/firebase";

export function RuntimeBadge() {
  if (isFirebaseConfigured) {
    return <span className="runtime-badge live">Firebase接続中</span>;
  }

  return <span className="runtime-badge demo">デモモード</span>;
}
