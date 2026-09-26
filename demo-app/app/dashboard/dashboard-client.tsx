"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "./logout-button";

type Props = {
  username: string;
  mode: "memory" | "cookie";
};

export default function DashboardClient({ username, mode }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (mode !== "memory") return;

    const navigation = performance.getEntriesByType("navigation")[0];
    const navigationType =
      navigation && "type" in navigation
        ? (navigation as PerformanceNavigationTiming).type
        : "navigate";

    if (navigationType === "reload") {
      router.replace("/login");
    }
  }, [mode, router]);

  return (
    <main>
      <h1 data-testid="dashboard-heading">Welcome, {username}</h1>
      <p data-testid="dashboard-status">You are logged in.</p>
      <LogoutButton />
    </main>
  );
}