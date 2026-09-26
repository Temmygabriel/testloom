import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionMode, memoryStoreGet } from "@/lib/session";
import LogoutButton from "./logout-button";

const COOKIE_NAME = "session_token";

async function getAuthenticatedUser(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const mode = getSessionMode();

  if (mode === "memory") {
    // In memory mode the Map may be empty after a serverless cold start,
    // which means the user is not authenticated — the broken-session scenario.
    return memoryStoreGet(token) ?? null;
  }

  // In cookie mode the token presence is sufficient proof of auth.
  return "demo";
}

export default async function DashboardPage() {
  const username = await getAuthenticatedUser();

  if (!username) {
    redirect("/login");
  }

  return (
    <main>
      <h1 data-testid="dashboard-heading">Welcome, {username}</h1>
      <p data-testid="dashboard-status">You are logged in.</p>
      <LogoutButton />
    </main>
  );
}
