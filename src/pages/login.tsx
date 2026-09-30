import { useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { request } from "@/lib/api";
import { Brand, ErrorBox, FieldError } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export function Login() {
  const auth = useAuth(),
    [twoFA, setTwoFA] = useState(""),
    [code, setCode] = useState(""),
    [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  if (auth.session) return <Navigate to="/" replace />;
  async function finish(values: unknown) {
    setBusy(true);
    setError(null);
    try {
      const result = await request<{
        accessToken?: string;
        twoFAToken?: string;
      }>(twoFA ? "/auth/verify-2fa" : "/auth/login", "", {
        method: "POST",
        body: JSON.stringify(values),
      });
      if (result.twoFAToken) {
        setTwoFA(result.twoFAToken);
        return;
      }
      if (!result.accessToken)
        throw new Error("No session was returned. Please try again.");
      await auth.signIn(result.accessToken);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell>
          <div className="eyebrow">WELCOME BACK</div>
          <h2>{twoFA ? "One more step." : "Your workspace awaits."}</h2>
          <p>
            {twoFA
              ? "Enter the six-digit code sent to your email or phone."
              : "Sign in to care for your community."}
          </p>
          {error && <ErrorBox error={error} />}
          <form
            onSubmit={
              twoFA
                ? (e) => {
                    e.preventDefault();
                    void finish({ twoFAToken: twoFA, code });
                  }
                : form.handleSubmit(finish)
            }
          >
            {twoFA ? (
              <div className="form-field">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            ) : (
              <>
                <div className="form-field">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@leirahealth.com"
                    {...form.register("email")}
                  />
                  <FieldError message={form.formState.errors.email?.message} />
                </div>
                <div className="form-field">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    {...form.register("password")}
                  />
                  <FieldError
                    message={form.formState.errors.password?.message}
                  />
                </div>
              </>
            )}
            <Button className="w-full mt-5" disabled={busy} type="submit">
              {busy
                ? "Signing in…"
                : twoFA
                  ? "Verify & continue"
                  : "Sign in to workspace"}
              <ArrowRight />
            </Button>
          </form>
          {twoFA ? (
            <div className="login-preview">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setTwoFA("");
                  setCode("");
                  setError(null);
                }}
              >
                Back to sign in
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await request<{ twoFAToken: string }>(
                      "/auth/resend-2fa-otp",
                      "",
                      {
                        method: "POST",
                        body: JSON.stringify({ twoFAToken: twoFA }),
                      },
                    );
                    setTwoFA(result.twoFAToken);
                  } catch (e) {
                    setError(e as Error);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Resend code
              </Button>
            </div>
          ) : (
            import.meta.env.VITE_ENABLE_DEMO === "true" && (
              <div className="login-preview">
                <span>Take a look around</span>
                <Button variant="outline" onClick={() => auth.preview()}>
                  Admin preview
                </Button>
                <Button variant="ghost" onClick={() => auth.preview(true)}>
                  Support preview
                </Button>
              </div>
            )
          )}
    </AuthShell>
  );
}
// Signed-out page frame shared by sign-in and invitation acceptance.
export function AuthShell({ children }: { children: ReactNode }) {
  const [year] = useState(() => new Date().getFullYear());
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand />
        <div>
          <div className="story-tag">THE LEIRA WORKSPACE</div>
          <h1>
            Behind every
            <br />
            healthier day,
            <br />
            <em>there’s you.</em>
          </h1>
          <p>
            A thoughtful space for the people who help
            <br className="desktop-only" /> our community feel a little better,
            every day.
          </p>
          <svg className="pulse-art" viewBox="0 0 600 140" aria-hidden="true">
            <path d="M0 70h140l20-17 22 33 34-78 40 123 31-61h73l24-24 21 24h195" />
          </svg>
        </div>
        <span className="story-footer">
          Leira Health <span>Care, connected.</span>
        </span>
      </section>
      <section className="login-panel">
        <div className="login-card">
          {children}
          <div className="secure-note">
            <ShieldCheck size={15} /> Secure access for Leira team members
          </div>
        </div>
        <div className="login-copyright">
          © {year} Leira Health. All rights reserved.
        </div>
      </section>
    </div>
  );
}
