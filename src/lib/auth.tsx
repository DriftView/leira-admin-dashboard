import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { request } from "./api";
import type { Session, User } from "./types";
import { demoUser } from "./demo";
import { Loading } from "@/components/shared";

type Auth = {
  session: Session | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  preview: (support?: boolean) => void;
};
const Context = createContext<Auth | null>(null);
// The access token lives in sessionStorage so a refresh doesn't sign the user
// out — it's cleared when the tab closes, on sign-out, and on 401 expiry, so
// exposure is bounded to the current tab's lifetime. Never localStorage: that
// would keep a token valid across browser restarts. Demo/preview sessions are
// synthetic and are never written to storage.
const TOKEN_KEY = "leira:token";
// Shared by sign-in and session restore: fetches the user for a token and
// rejects anyone outside the workspace roles, revoking the token if so.
async function loadWorkspaceUser(token: string): Promise<User> {
  const user = await request<User>("/users/me", token);
  if (!["admin", "support"].includes(user.role)) {
    await request("/auth/logout", token, { method: "POST" });
    throw new Error(
      "This workspace is for administrators and support staff.",
    );
  }
  return user;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(
    () => !!sessionStorage.getItem(TOKEN_KEY),
  );
  const client = useQueryClient();
  useEffect(() => {
    const expired = () => {
      sessionStorage.removeItem(TOKEN_KEY);
      setSession(null);
      client.clear();
    };
    window.addEventListener("leira:expired", expired);
    return () => window.removeEventListener("leira:expired", expired);
  }, [client]);
  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    loadWorkspaceUser(token)
      .then((user) => setSession({ token, user, demo: false }))
      .catch(() => sessionStorage.removeItem(TOKEN_KEY))
      .finally(() => setRestoring(false));
  }, []);
  const value: Auth = {
    session,
    signIn: async (token) => {
      const user = await loadWorkspaceUser(token);
      client.clear();
      sessionStorage.setItem(TOKEN_KEY, token);
      setSession({ token, user, demo: false });
    },
    signOut: async () => {
      if (session && !session.demo)
        await request("/auth/logout", session.token, { method: "POST" });
      sessionStorage.removeItem(TOKEN_KEY);
      setSession(null);
      client.clear();
    },
    preview: (support = false) => {
      client.clear();
      setSession({
        token: "",
        user: { ...demoUser, role: support ? "support" : "admin" },
        demo: true,
      });
    },
  };
  if (restoring) return <Loading />;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing auth provider");
  return context;
}
