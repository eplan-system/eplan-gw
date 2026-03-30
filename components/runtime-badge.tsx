"use client";

import { isFirebaseConfigured } from "@/lib/firebase";

export function RuntimeBadge() {
  if (isFirebaseConfigured) {
    return <span className="runtime-badge live">オンライン</span>;
  }

  return <span className="runtime-badge demo">デモ</span>;
}
