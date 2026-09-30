import { lazy, Suspense } from "react";
import { Loading } from "./components/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { ApiError } from "./lib/api";
import { Layout, AdminOnly } from "./components/layout";
import { Login } from "./pages/login";
import { OverviewPage } from "./pages/overview";
const AcceptInvite = lazy(() =>
  import("./pages/accept-invite").then((m) => ({ default: m.AcceptInvite })),
);
const MembersPage = lazy(() =>
  import("./pages/members").then((m) => ({ default: m.MembersPage })),
);
const SupportPage = lazy(() =>
  import("./pages/support").then((m) => ({ default: m.SupportPage })),
);
const ContentPage = lazy(() =>
  import("./pages/content").then((m) => ({ default: m.ContentPage })),
);
const TeamPage = lazy(() =>
  import("./pages/team").then((m) => ({ default: m.TeamPage })),
);
const AuditPage = lazy(() =>
  import("./pages/audit").then((m) => ({ default: m.AuditPage })),
);
const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) =>
        !(error instanceof ApiError && error.status < 500) && count < 1,
    },
    mutations: { retry: false },
  },
});
export default function App() {
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              <Route element={<Layout />}>
                <Route index element={<OverviewPage />} />
                <Route path="members" element={<MembersPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="content" element={<ContentPage />} />
                <Route path="analytics" element={<OverviewPage analytics />} />
                <Route
                  path="team"
                  element={
                    <AdminOnly>
                      <TeamPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <AdminOnly>
                      <AuditPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="empty-state">
                      <h1>Page not found.</h1>
                      <Link to="/">Return to your overview</Link>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
