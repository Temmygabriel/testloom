import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionMode } from "@/lib/session";
import DashboardClient from "./dashboard-client";

const COOKIE_NAME = "session_token";

async function getAuthenticatedUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const mode = getSessionMode();

  if (mode === "memory") {
    return "demo";
  }

  return "demo";
}

export default async function DashboardPage() {
  const username = await getAuthenticatedUser();

  if (!username) {
    redirect("/login");
  }

  return (
    <DashboardClient
      username={username}
      mode={getSessionMode()}
    />
  );
}
