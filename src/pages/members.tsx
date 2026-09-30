import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useList, useSave } from "@/lib/queries";
import { date } from "@/lib/utils";
import type { User } from "@/lib/types";
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
const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(50),
  lastName: z.string().trim().min(1, "Last name is required.").max(50),
  isActive: z.boolean(),
});
export function MembersPage() {
  const filters = useFilters(),
    query = useList<User>("members", filters.query),
    [selected, setSelected] = useState<User | null>(null),
    [notice, setNotice] = useState(""),
    { session } = useAuth();
  return (
    <>
      <Heading
        title="People at the heart of Leira."
        description="A thoughtful view of your community and their account setup."
      />
      {notice && (
        <div className="success-note" role="status">
          {notice}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Member directory{" "}
              <span className="count-chip">{query.data?.total ?? "—"}</span>
            </h2>
            <p>
              {session?.user.role === "admin"
                ? "Manage account details and access."
                : "Account details available to your support team."}
            </p>
          </div>
          <span className="subtle-label">YOUR COMMUNITY</span>
        </div>
        <Toolbar
          filters={filters}
          placeholder="Search name or email…"
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
                    <th>Member</th>
                    <th>Account</th>
                    <th>Email</th>
                    <th>Onboarding</th>
                    <th>Joined</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
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
                        <Pill value={u.isActive ? "active" : "inactive"} />
                      </td>
                      <td className="muted-cell">
                        {u.isEmailVerified ? "Verified" : "Unverified"}
                      </td>
                      <td>
                        <Pill value={u.onboardingStatus} />
                      </td>
                      <td className="muted-cell">{date(u.createdAt)}</td>
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`View ${u.firstName} ${u.lastName}`}
                          onClick={() => setSelected(u)}
                        >
                          <ArrowUpRight />
                        </Button>
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
        <MemberDialog
          member={selected}
          onClose={() => setSelected(null)}
          onSaved={(message) => {
            setNotice(message);
            setSelected(null);
          }}
        />
      )}
    </>
  );
}
function MemberDialog({
  member,
  onClose,
  onSaved,
}: {
  member: User;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { session } = useAuth(),
    admin = session?.user.role === "admin",
    save = useSave("members", member._id),
    form = useForm<z.infer<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: {
        firstName: member.firstName,
        lastName: member.lastName,
        isActive: member.isActive,
      },
    });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>Member details</DialogTitle>
        <DialogDescription>{member.email}</DialogDescription>
        <div className="detail-meta">
          <span>Joined {date(member.createdAt)}</span>
          <span>Last sign-in {date(member.lastLoginAt)}</span>
        </div>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const result = await save.mutateAsync(values).catch(() => null);
            if (result)
              onSaved(
                result.preview
                  ? "Preview only — no member data was changed."
                  : "Member account updated.",
              );
          })}
        >
          <fieldset disabled={!admin || save.isPending}>
            <div className="form-grid">
              <div className="form-field">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" {...form.register("firstName")} />
                <FieldError
                  message={form.formState.errors.firstName?.message}
                />
              </div>
              <div className="form-field">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" {...form.register("lastName")} />
                <FieldError message={form.formState.errors.lastName?.message} />
              </div>
            </div>
            <label className="checkbox-field">
              <input type="checkbox" {...form.register("isActive")} />
              <span>
                Account active
                <small>Inactive members cannot sign in to Leira.</small>
              </span>
            </label>
          </fieldset>
          {save.error && <ErrorBox error={save.error} />}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={save.isPending}
            >
              Close
            </Button>
            {admin && (
              <Button disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
