import { useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  BookOpen,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Brand, Avatar } from "./shared";
import { Button } from "./ui/button";
const navigation = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/members", label: "Members", icon: Users },
  { to: "/support", label: "Support inbox", icon: LifeBuoy },
  { to: "/care-team", label: "Care team", icon: Stethoscope },
  { to: "/content", label: "Health content", icon: BookOpen },
  { to: "/analytics", label: "Analytics", icon: Activity },
];
export function Layout() {
  const { session, signOut } = useAuth(),
    location = useLocation(),
    [mobile, setMobile] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (!session)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  const admin = session.user.role === "admin",
    all = [
      ...navigation,
      ...(admin
        ? [
            { to: "/team", label: "Team & access", icon: ShieldCheck },
            { to: "/audit", label: "Audit log", icon: Activity },
          ]
        : []),
    ],
    title = all.find((n) => n.to === location.pathname)?.label || "Workspace";
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <Brand />
        <Button
          className="mobile-close"
          variant="ghost"
          size="icon"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X />
        </Button>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobile(false)}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {admin && (
          <>
            <div className="nav-label">ADMINISTRATION</div>
            <nav aria-label="Administration">
              {all.slice(navigation.length).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobile(false)}
                >
                  <item.icon />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="care-note">
            <HeartPulse />
            <strong>Good care starts here.</strong>
            <p>
              Small actions.
              <br />A healthier community.
            </p>
            <span>
              THE LEIRA WAY <span>↗</span>
            </span>
          </div>
          <div className="sidebar-profile">
            <Avatar
              first={session.user.firstName}
              last={session.user.lastName}
            />
            <div>
              <strong>
                {session.user.firstName} {session.user.lastName}
              </strong>
              <span>{admin ? "Administrator" : "Support staff"}</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        {session.demo && (
          <div className="demo-banner">
            Sample workspace · Synthetic data · Changes are not saved
          </div>
        )}
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </Button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="access-badge">
              <ShieldCheck size={14} />
              {admin ? "Admin access" : "Support access"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await signOut();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <LogOut />
              {session.demo ? "Exit preview" : "Sign out"}
            </Button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <Outlet />
          <footer className="workspace-footer">
            <span>
              Leira Health <span className="footer-dot">·</span> Care,
              connected.
            </span>
            <span>
              {session.demo
                ? "Illustrative sample data"
                : "Reports use UTC dates"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  return session?.user.role === "admin" ? (
    children
  ) : (
    <Navigate to="/" replace />
  );
}
