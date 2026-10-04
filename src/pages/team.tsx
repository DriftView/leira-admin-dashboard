import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, ShieldCheck } from "lucide-react";
import { useList, useSave } from "@/lib/queries";
import { date } from "@/lib/utils";
import type { StaffInviteResult, User } from "@/lib/types";
import {
  Avatar,
  Empty,
  ErrorBox,
  FieldError,
  Heading,
  Loading,
  Pagination,
  Pill,
  Toolbar,
  useFilters,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Workspace roles only. Clinicians ("doctor") are invited and managed from
// the Care team page because they need their own work account.
const schema = z.object({
  email: z.email("Enter a valid email address."),
  role: z.enum(["admin", "support", "user"]),
});
export function TeamPage() {
  const filters = useFilters(),
    query = useList<User>("staff", filters.query),
    [selected, setSelected] = useState<User | "new" | null>(null),
    [notice, setNotice] = useState("");
  return (
    <>
      <Heading
        title="Great care is a team effort."
        description="Give the right people the right access to your Leira workspace."
      >
        <Button onClick={() => setSelected("new")}>
          <Plus />
          Grant staff access
        </Button>
      </Heading>
      {notice && (
        <div className="success-note" role="status">
          {notice}
        </div>
      )}
      <div className="permission-cards">
        <article>
          <ShieldCheck />
          <div>
            <h3>Administrator</h3>
            <p>Members, content, analytics, support, and team permissions.</p>
          </div>
        </article>
        <article>
          <ShieldCheck />
          <div>
            <h3>Support staff</h3>
            <p>
              Limited member details, support cases, support metrics, and
              read-only content.
            </p>
          </div>
        </article>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Your team{" "}
              <span className="count-chip">{query.data?.total ?? "—"}</span>
            </h2>
            <p>
              Staff sign in with their Leira accounts. New people are invited
              by email.
            </p>
          </div>
        </div>
        <Toolbar
          filters={filters}
          placeholder="Search team members…"
          onRefresh={() => void query.refetch()}
        />
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorBox error={query.error} retry={() => void query.refetch()} />
        ) : query.data.items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Team member</th>
                    <th>Role</th>
                    <th>Account</th>
                    <th>Last sign-in</th>
                    <th>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className="person">
                          <Avatar first={u.firstName} last={u.lastName} />
                          <div>
                            <strong>
                              {u.firstName} {u.lastName}
                            </strong>
                            <small>{u.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Pill
                          value={u.role === "doctor" ? "clinician" : u.role}
                        />
                      </td>
                      <td>
                        <Pill value={u.isActive ? "active" : "inactive"} />
                      </td>
                      <td className="muted-cell">{date(u.lastLoginAt)}</td>
                      <td>
                        {u.role === "admin" ? (
                          <span className="muted-cell">Protected</span>
                        ) : u.role === "doctor" ? (
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/care-team">Manage in Care team</Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelected(u)}
                          >
                            Manage access
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              {...query.data}
              onChange={(page) => filters.set({ page: String(page) })}
            />
          </>
        ) : (
          <Empty />
        )}
      </section>
      {selected && (
        <StaffDialog
          user={selected === "new" ? undefined : selected}
          onClose={() => setSelected(null)}
          onSaved={(message) => {
            setSelected(null);
            setNotice(message);
          }}
        />
      )}
    </>
  );
}
function StaffDialog({
  user,
  onClose,
  onSaved,
}: {
  user?: User;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const save = useSave("staff"),
    form = useForm<z.infer<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: { email: user?.email || "", role: "support" },
    });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>
          {user ? "Manage staff access" : "Grant staff access"}
        </DialogTitle>
        <DialogDescription>
          {user
            ? "Existing administrator access is protected."
            : "Existing Leira accounts must be active and email verified. If nobody uses this email yet, we’ll send an invitation that expires in 7 days."}
        </DialogDescription>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const result = await save.mutateAsync(values).catch(() => null);
            if (!result) return;
            const invite = result.data as StaffInviteResult | undefined;
            onSaved(
              result.preview
                ? "Preview only — no permissions were changed."
                : invite?.invited
                  ? `Invitation sent to ${invite.email}. The link expires on ${date(invite.expiresAt)}.`
                  : "Staff access updated.",
            );
          })}
        >
          <div className="form-field">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              readOnly={!!user}
              {...form.register("email")}
            />
            <FieldError message={form.formState.errors.email?.message} />
          </div>
          <div className="form-field">
            <Label htmlFor="role">Role</Label>
            <select id="role" {...form.register("role")}>
              <option value="support">Support staff</option>
              <option value="admin">
                Administrator — full workspace access
              </option>
              {user && (
                <option value="user">Member — remove staff access</option>
              )}
            </select>
          </div>
          <div className="info-note">
            Granting administrator access permits account changes, publishing,
            and team management. Administrator access cannot be removed from
            this dashboard.
          </div>
          {save.error && <ErrorBox error={save.error} />}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={save.isPending}
            >
              Cancel
            </Button>
            <Button disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save access"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
