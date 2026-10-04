import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { request } from "@/lib/api";
import { date } from "@/lib/utils";
import type { StaffInvite } from "@/lib/types";
import { ErrorBox, FieldError, Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "./login";
const schema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name.").max(50),
    lastName: z.string().trim().min(1, "Enter your last name.").max(50),
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128, "Use 128 characters or fewer."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
const roleLabel = (role: string) =>
  role === "admin"
    ? "an administrator"
    : role === "doctor"
      ? "a clinician"
      : "support staff";
// The emailed link carries the token in the URL fragment, which browsers never
// send to the host serving this app. It is read once, then removed from the
// address bar and history so it is not left behind in a shared browser.
export function AcceptInvite() {
  const [token] = useState(() => window.location.hash.slice(1));
  useEffect(() => {
    if (window.location.hash)
      window.history.replaceState(null, "", window.location.pathname);
  }, []);
  const invite = useQuery({
    queryKey: ["staff-invite", token],
    queryFn: () =>
      request<StaffInvite>("/staff-invites/preview", "", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    enabled: !!token,
    staleTime: Infinity,
  });
  const accept = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      request<{ email: string }>("/staff-invites/accept", "", {
        method: "POST",
        body: JSON.stringify({ token, ...values }),
      }),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });
  if (!token || invite.error)
    return (
      <AuthShell>
        <div className="eyebrow">INVITATION</div>
        <h2>This link can’t be used.</h2>
        <p>
          {invite.error?.message ||
            "The invitation link is incomplete. Open it again from your email, or ask your Leira administrator for a new one."}
        </p>
        <Button asChild variant="outline" className="w-full mt-5">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  if (invite.isPending)
    return (
      <AuthShell>
        <Loading />
      </AuthShell>
    );
  // Clinicians can't use this workspace (auth blocks the role), so instead of
  // sending them to the web sign-in we point them at the mobile app.
  if (accept.isSuccess && invite.data.role === "doctor")
    return (
      <AuthShell>
        <div className="eyebrow">YOU’RE IN</div>
        <h2>Welcome to Leira’s care team.</h2>
        <p>
          Your account is ready. Sign in on the Leira mobile app with{" "}
          {accept.data.email}.
        </p>
      </AuthShell>
    );
  if (accept.isSuccess)
    return (
      <AuthShell>
        <div className="eyebrow">YOU’RE IN</div>
        <h2>Welcome to the team.</h2>
        <p>
          Your account for {accept.data.email} is ready. Sign in with the
          password you just chose.
        </p>
        <Button asChild className="w-full mt-5">
          <Link to="/login">
            Sign in to workspace
            <ArrowRight />
          </Link>
        </Button>
      </AuthShell>
    );
  const clinician = invite.data.role === "doctor";
  return (
    <AuthShell>
      <div className="eyebrow">YOU’RE INVITED</div>
      <h2>
        {clinician ? "Join Leira as a clinician." : "Join the Leira workspace."}
      </h2>
      <p>
        You’ve been invited as {roleLabel(invite.data.role)}.{" "}
        {clinician
          ? "Create your account to accept, then sign in on the Leira mobile app to see the members connected with you."
          : "Create your account to accept."}{" "}
        This invitation expires on {date(invite.data.expiresAt)}.
      </p>
      {accept.error && <ErrorBox error={accept.error} />}
      <form onSubmit={form.handleSubmit((values) => accept.mutate(values))}>
        <div className="form-field">
          <Label htmlFor="invite-email">Work email</Label>
          <Input
            id="invite-email"
            type="email"
            autoComplete="username"
            value={invite.data.email}
            readOnly
          />
        </div>
        <div className="form-field">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            autoComplete="given-name"
            {...form.register("firstName")}
          />
          <FieldError message={form.formState.errors.firstName?.message} />
        </div>
        <div className="form-field">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            autoComplete="family-name"
            {...form.register("lastName")}
          />
          <FieldError message={form.formState.errors.lastName?.message} />
        </div>
        <div className="form-field">
          <Label htmlFor="new-password">Password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
          <FieldError message={form.formState.errors.password?.message} />
        </div>
        <div className="form-field">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
          <FieldError
            message={form.formState.errors.confirmPassword?.message}
          />
        </div>
        <Button
          className="w-full mt-5"
          disabled={accept.isPending}
          type="submit"
        >
          {accept.isPending ? "Creating account…" : "Accept invitation"}
          <ArrowRight />
        </Button>
      </form>
    </AuthShell>
  );
}
