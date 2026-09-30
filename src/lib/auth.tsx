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

type Auth = {
  session: Session | null;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  preview: (support?: boolean) => void;
};
const Context = createContext<Auth | null>(null);
// Access tokens intentionally stay in memory. Reloading requires authentication;
// member data and credentials are never persisted to browser storage.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const client = useQueryClient();
  useEffect(() => {
    const expired = () => {
      setSession(null);
      client.clear();
    };
    window.addEventListener("leira:expired", expired);
    return () => window.removeEventListener("leira:expired", expired);
  }, [client]);
  const value: Auth = {
    session,
    signIn: async (token) => {
      const user = await request<User>("/users/me", token);
      if (!["admin", "support"].includes(user.role)) {
        await request("/auth/logout", token, { method: "POST" });
        throw new Error(
          "This workspace is for administrators and support staff.",
        );
      }
      client.clear();
      setSession({ token, user, demo: false });
    },
    signOut: async () => {
      if (session && !session.demo)
        await request("/auth/logout", session.token, { method: "POST" });
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
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing auth provider");
  return context;
}
