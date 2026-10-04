import { useEffect, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, RefreshCw, Stethoscope, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useCareTeamAction,
  useClinicians,
  useList,
  useSave,
} from "@/lib/queries";
import { date } from "@/lib/utils";
import type {
  CareLink,
  CareLinkStatus,
  Clinician,
  StaffInviteResult,
  User,
} from "@/lib/types";
import {
  Avatar,
  Empty,
  ErrorBox,
  FieldError,
  Heading,
  Loading,
  Pagination,
  Pill,
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
import { Textarea } from "@/components/ui/textarea";
const tabs = [
  { key: "requests", label: "Requests" },
  { key: "active", label: "Active connections" },
  { key: "clinicians", label: "Clinicians" },
] as const;
type Tab = (typeof tabs)[number]["key"];
// One dialog is open at a time; the union keeps each one's subject typed.
type Open =
  | { kind: "approve" | "decline" | "end"; link: CareLink }
  | { kind: "edit"; clinician: Clinician }
  | { kind: "assign" | "invite" };
const pickSchema = z.object({
  clinicianId: z.string().min(1, "Choose a clinician."),
});
const declineSchema = z.object({
  reason: z.string().trim().max(500, "Use 500 characters or fewer."),
});
const assignSchema = z.object({
  patientId: z.string().min(1, "Choose a patient."),
  clinicianId: z.string().min(1, "Choose a clinician."),
});
const clinicianSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(80),
  organisation: z.string().trim().max(120),
  acceptingPatients: z.boolean(),
});
const inviteSchema = z.object({
  email: z.email("Enter a valid email address."),
  title: z
    .string()
    .trim()
    .min(1, "Add a title, for example GP or Nurse.")
    .max(80, "Use 80 characters or fewer."),
  organisation: z.string().trim().max(120, "Use 120 characters or fewer."),
});
const name = (p: { firstName: string; lastName: string }) =>
  `${p.firstName} ${p.lastName}`;
export function CareTeamPage() {
  const { session } = useAuth(),
    admin = session?.user.role === "admin",
    [tab, setTab] = useState<Tab>("requests"),
    [open, setOpen] = useState<Open | null>(null),
    [notice, setNotice] = useState("");
  const close = () => setOpen(null),
    saved = (message: string) => {
      setOpen(null);
      setNotice(message);
    };
  return (
    <>
      <Heading
        title="Care is better together."
        description="Connect members with the clinicians who look after them."
      />
      {notice && (
        <div className="success-note" role="status">
          {notice}
        </div>
      )}
      <div className="section-tabs" role="group" aria-label="Care team views">
        {tabs.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "secondary" : "ghost"}
            aria-pressed={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {tab === "clinicians" ? (
        <CliniciansPanel admin={admin} onOpen={setOpen} />
      ) : (
        <LinksPanel
          key={tab}
          status={tab === "requests" ? "requested" : "active"}
          admin={admin}
          onOpen={setOpen}
        />
      )}
      {open?.kind === "approve" && (
        <ApproveDialog link={open.link} onClose={close} onSaved={saved} />
      )}
      {open?.kind === "decline" && (
        <DeclineDialog link={open.link} onClose={close} onSaved={saved} />
      )}
      {open?.kind === "end" && (
        <EndDialog link={open.link} onClose={close} onSaved={saved} />
      )}
      {open?.kind === "assign" && (
        <AssignDialog onClose={close} onSaved={saved} />
      )}
      {open?.kind === "edit" && (
        <ClinicianDialog
          clinician={open.clinician}
          onClose={close}
          onSaved={saved}
        />
      )}
      {open?.kind === "invite" && (
        <InviteDialog onClose={close} onSaved={saved} />
      )}
    </>
  );
}
function LinksPanel({
  status,
  admin,
  onOpen,
}: {
  status: Extract<CareLinkStatus, "requested" | "active">;
  admin: boolean;
  onOpen: (open: Open) => void;
}) {
  const [page, setPage] = useState(1),
    query = useList<CareLink>(
      "care-team/links",
      new URLSearchParams({ status, page: String(page), limit: "10" }),
    ),
    requests = status === "requested";
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            {requests ? "Connection requests" : "Active connections"}{" "}
            <span className="count-chip">{query.data?.total ?? "—"}</span>
          </h2>
          <p>
            {requests
              ? admin
                ? "Members asking to be connected with a clinician."
                : "Members asking to be connected with a clinician. Administrators approve requests."
              : "Members currently sharing their health data with a clinician."}
          </p>
        </div>
        <div className="heading-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh results"
            onClick={() => void query.refetch()}
          >
            <RefreshCw />
          </Button>
          {admin && !requests && (
            <Button size="sm" onClick={() => onOpen({ kind: "assign" })}>
              <UserPlus />
              Assign clinician
            </Button>
          )}
        </div>
      </div>
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
                  <th>Patient</th>
                  {requests ? (
                    <>
                      <th>Note</th>
                      <th>Requested</th>
                    </>
                  ) : (
                    <>
                      <th>Clinician</th>
                      <th>Origin</th>
                      <th>Started</th>
                    </>
                  )}
                  {admin && (
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <div className="person">
                        <Avatar
                          first={link.patient.firstName}
                          last={link.patient.lastName}
                        />
                        <div>
                          <strong>{name(link.patient)}</strong>
                          <small>{link.patient.email}</small>
                        </div>
                      </div>
                    </td>
                    {requests ? (
                      <>
                        <td className="muted-cell">
                          <span
                            className="block max-w-[320px] truncate"
                            title={link.requestNote || undefined}
                          >
                            {link.requestNote || "—"}
                          </span>
                        </td>
                        <td className="muted-cell">{date(link.createdAt)}</td>
                      </>
                    ) : (
                      <>
                        <td>
                          {link.clinician ? (
                            <>
                              <strong>{name(link.clinician)}</strong>
                              <small className="cell-subtitle">
                                {link.clinician.email}
                              </small>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="muted-cell">
                          {link.origin === "admin"
                            ? "Assigned by admin"
                            : "Patient request"}
                        </td>
                        <td className="muted-cell">
                          {date(link.startedAt ?? link.createdAt)}
                        </td>
                      </>
                    )}
                    {admin && (
                      <td>
                        {requests ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => onOpen({ kind: "approve", link })}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onOpen({ kind: "decline", link })}
                            >
                              Decline
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpen({ kind: "end", link })}
                          >
                            End
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...query.data} onChange={setPage} />
        </>
      ) : requests ? (
        <Empty
          title="No requests waiting."
          description="New connection requests from members will appear here."
        />
      ) : (
        <Empty
          title="No active connections yet."
          description="Approve a request or assign a clinician to get started."
        />
      )}
    </section>
  );
}
function CliniciansPanel({
  admin,
  onOpen,
}: {
  admin: boolean;
  onOpen: (open: Open) => void;
}) {
  const query = useClinicians();
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            Clinicians{" "}
            <span className="count-chip">{query.data?.length ?? "—"}</span>
          </h2>
          <p>
            Clinicians sign in on the Leira mobile app with their own work
            accounts.
          </p>
        </div>
        <div className="heading-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh results"
            onClick={() => void query.refetch()}
          >
            <RefreshCw />
          </Button>
          {admin && (
            <Button size="sm" onClick={() => onOpen({ kind: "invite" })}>
              <Plus />
              Invite clinician
            </Button>
          )}
        </div>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorBox error={query.error} retry={() => void query.refetch()} />
      ) : query.data.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Clinician</th>
                <th>Title</th>
                <th>Organisation</th>
                <th>Patients</th>
                <th>Accepting</th>
                <th>Last sign-in</th>
                {admin && (
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {query.data.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="person">
                      <Avatar first={c.firstName} last={c.lastName} />
                      <div>
                        <strong>{name(c)}</strong>
                        <small>{c.email}</small>
                      </div>
                    </div>
                  </td>
                  <td className="muted-cell">{c.title || "—"}</td>
                  <td className="muted-cell">{c.organisation || "—"}</td>
                  <td className="muted-cell">{c.patientCount}</td>
                  <td>
                    <Pill
                      value={
                        !c.isActive
                          ? "inactive"
                          : c.acceptingPatients
                            ? "accepting"
                            : "not_accepting"
                      }
                    />
                  </td>
                  <td className="muted-cell">
                    {date(c.lastLoginAt ?? undefined)}
                  </td>
                  {admin && (
                    <td>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpen({ kind: "edit", clinician: c })}
                      >
                        Edit
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No clinicians yet."
          description={
            admin
              ? "Invite a clinician to start connecting members with care."
              : "An administrator can invite clinicians."
          }
        />
      )}
    </section>
  );
}
// Only active clinicians who are taking new patients can be picked; the
// backend rejects anyone else, so they're filtered out up front.
function ClinicianSelect({
  id,
  registration,
  error,
}: {
  id: string;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  const clinicians = useClinicians(),
    available = (clinicians.data || []).filter(
      (c) => c.isActive && c.acceptingPatients,
    );
  return (
    <div className="form-field">
      <Label htmlFor={id}>Clinician</Label>
      <select
        id={id}
        disabled={clinicians.isPending || !available.length}
        {...registration}
      >
        <option value="">
          {clinicians.isPending
            ? "Loading clinicians…"
            : available.length
              ? "Choose a clinician"
              : "No clinicians are accepting patients"}
        </option>
        {available.map((c) => (
          <option key={c.id} value={c.id}>
            {name(c)} — {c.title || "Clinician"} · {c.patientCount}{" "}
            {c.patientCount === 1 ? "patient" : "patients"}
          </option>
        ))}
      </select>
      {clinicians.error && <ErrorBox error={clinicians.error} />}
      <FieldError message={error} />
    </div>
  );
}
type DialogProps = {
  onClose: () => void;
  onSaved: (message: string) => void;
};
function ApproveDialog({
  link,
  onClose,
  onSaved,
}: DialogProps & { link: CareLink }) {
  const action = useCareTeamAction(),
    form = useForm<z.infer<typeof pickSchema>>({
      resolver: zodResolver(pickSchema),
      defaultValues: { clinicianId: "" },
    });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>Approve request</DialogTitle>
        <DialogDescription>
          Connect {name(link.patient)} with a clinician. They’ll be able to see
          the health data this member shares.
        </DialogDescription>
        {link.requestNote && (
          <div className="case-description">{link.requestNote}</div>
        )}
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const result = await action
              .mutateAsync({ path: `links/${link.id}/approve`, body: values })
              .catch(() => null);
            if (result)
              onSaved(
                result.preview
                  ? "Preview only — no connection was changed."
                  : `${name(link.patient)} is now connected with their clinician.`,
              );
          })}
        >
          <fieldset disabled={action.isPending}>
            <ClinicianSelect
              id="approve-clinician"
              registration={form.register("clinicianId")}
              error={form.formState.errors.clinicianId?.message}
            />
          </fieldset>
          {action.error && <ErrorBox error={action.error} />}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={action.isPending}
            >
              Cancel
            </Button>
            <Button disabled={action.isPending}>
              {action.isPending ? "Approving…" : "Approve"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function DeclineDialog({
  link,
  onClose,
  onSaved,
}: DialogProps & { link: CareLink }) {
  const action = useCareTeamAction(),
    form = useForm<z.infer<typeof declineSchema>>({
      resolver: zodResolver(declineSchema),
      defaultValues: { reason: "" },
    });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>Decline request</DialogTitle>
        <DialogDescription>
          {name(link.patient)} asked to be connected with a clinician on{" "}
          {date(link.createdAt)}.
        </DialogDescription>
        <form
          onSubmit={form.handleSubmit(async ({ reason }) => {
            const result = await action
              .mutateAsync({
                path: `links/${link.id}/decline`,
                body: reason ? { reason } : {},
              })
              .catch(() => null);
            if (result)
              onSaved(
                result.preview
                  ? "Preview only — no request was changed."
                  : "Request declined.",
              );
          })}
        >
          <fieldset disabled={action.isPending}>
            <div className="form-field">
              <Label htmlFor="decline-reason">Reason (optional)</Label>
              <Textarea
                id="decline-reason"
                placeholder="Let the member know why, and any next steps…"
                {...form.register("reason")}
              />
              <FieldError message={form.formState.errors.reason?.message} />
            </div>
          </fieldset>
          {action.error && <ErrorBox error={action.error} />}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={action.isPending}
            >
              Cancel
            </Button>
            <Button disabled={action.isPending}>
              {action.isPending ? "Declining…" : "Decline request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function EndDialog({
  link,
  onClose,
  onSaved,
}: DialogProps & { link: CareLink }) {
  const action = useCareTeamAction();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>End this connection?</DialogTitle>
        <DialogDescription>
          {link.clinician ? name(link.clinician) : "The clinician"} will no
          longer see {name(link.patient)}’s health data. This can’t be undone,
          but you can assign them again later.
        </DialogDescription>
        {action.error && <ErrorBox error={action.error} />}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={action.isPending}
          >
            Keep connection
          </Button>
          <Button
            disabled={action.isPending}
            onClick={async () => {
              const result = await action
                .mutateAsync({ path: `links/${link.id}`, method: "DELETE" })
                .catch(() => null);
              if (result)
                onSaved(
                  result.preview
                    ? "Preview only — no connection was changed."
                    : "Connection ended.",
                );
            }}
          >
            {action.isPending ? "Ending…" : "End connection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// Patients come from the member directory (members are always role "user").
// The search waits for a pause in typing so each keystroke isn't a request.
function AssignDialog({ onClose, onSaved }: DialogProps) {
  const action = useCareTeamAction(),
    [search, setSearch] = useState(""),
    [term, setTerm] = useState(""),
    [patient, setPatient] = useState<User | null>(null),
    form = useForm<z.infer<typeof assignSchema>>({
      resolver: zodResolver(assignSchema),
      defaultValues: { patientId: "", clinicianId: "" },
    });
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const patients = useList<User>(
    "members",
    new URLSearchParams({ search: term, page: "1", limit: "6" }),
    term.length >= 2,
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>Assign a clinician</DialogTitle>
        <DialogDescription>
          Connect a member directly. Any open request from them is settled at
          the same time. Members can have up to three clinicians.
        </DialogDescription>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const result = await action
              .mutateAsync({ path: "links", body: values })
              .catch(() => null);
            if (result)
              onSaved(
                result.preview
                  ? "Preview only — no connection was changed."
                  : `${patient ? name(patient) : "The member"} is now connected with their clinician.`,
              );
          })}
        >
          <fieldset disabled={action.isPending}>
            <div className="form-field">
              <Label htmlFor="patient-search">Patient</Label>
              <Input
                id="patient-search"
                placeholder="Search name or email…"
                maxLength={100}
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {term.length >= 2 &&
                (patients.isPending ? (
                  <small className="field-help">Searching…</small>
                ) : patients.error ? (
                  <ErrorBox error={patients.error} />
                ) : patients.data.items.length ? (
                  <div
                    className="picker-list"
                    role="group"
                    aria-label="Matching members"
                  >
                    {patients.data.items.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        aria-pressed={patient?._id === u._id}
                        onClick={() => {
                          setPatient(u);
                          form.setValue("patientId", u._id, {
                            shouldValidate: true,
                          });
                        }}
                      >
                        <Avatar first={u.firstName} last={u.lastName} />
                        <span>
                          <strong>{name(u)}</strong>
                          <small>{u.email}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <small className="field-help">No members match.</small>
                ))}
              {patient && (
                <small className="field-help">
                  Selected: {name(patient)} · {patient.email}
                </small>
              )}
              <FieldError message={form.formState.errors.patientId?.message} />
            </div>
            <ClinicianSelect
              id="assign-clinician"
              registration={form.register("clinicianId")}
              error={form.formState.errors.clinicianId?.message}
            />
          </fieldset>
          {action.error && <ErrorBox error={action.error} />}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={action.isPending}
            >
              Cancel
            </Button>
            <Button disabled={action.isPending}>
              {action.isPending ? "Assigning…" : "Assign clinician"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ClinicianDialog({
  clinician,
  onClose,
  onSaved,
}: DialogProps & { clinician: Clinician }) {
  const save = useSave("care-team/clinicians", clinician.id),
    form = useForm<z.infer<typeof clinicianSchema>>({
      resolver: zodResolver(clinicianSchema),
      defaultValues: {
        title: clinician.title || "",
        organisation: clinician.organisation || "",
        acceptingPatients: clinician.acceptingPatients,
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
        <DialogTitle>{name(clinician)}</DialogTitle>
        <DialogDescription>{clinician.email}</DialogDescription>
        <div className="detail-meta">
          <span>
            {clinician.patientCount}{" "}
            {clinician.patientCount === 1 ? "patient" : "patients"}
          </span>
          <span>Last sign-in {date(clinician.lastLoginAt ?? undefined)}</span>
        </div>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const result = await save.mutateAsync(values).catch(() => null);
            if (result)
              onSaved(
                result.preview
                  ? "Preview only — no clinician was changed."
                  : "Clinician details updated.",
              );
          })}
        >
          <fieldset disabled={save.isPending}>
            <div className="form-grid">
              <div className="form-field">
                <Label htmlFor="clinician-title">Title</Label>
                <Input id="clinician-title" {...form.register("title")} />
                <FieldError message={form.formState.errors.title?.message} />
              </div>
              <div className="form-field">
                <Label htmlFor="clinician-organisation">Organisation</Label>
                <Input
                  id="clinician-organisation"
                  {...form.register("organisation")}
                />
                <FieldError
                  message={form.formState.errors.organisation?.message}
                />
              </div>
            </div>
            <label className="checkbox-field">
              <input type="checkbox" {...form.register("acceptingPatients")} />
              <span>
                Accepting new patients
                <small>
                  Existing connections stay in place when this is turned off.
                </small>
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
              Cancel
            </Button>
            <Button disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
// Clinicians are invited through the staff endpoint with role "doctor". They
// need a fresh work account, so the backend refuses emails already on Leira.
function InviteDialog({ onClose, onSaved }: DialogProps) {
  const save = useSave("staff"),
    form = useForm<z.infer<typeof inviteSchema>>({
      resolver: zodResolver(inviteSchema),
      defaultValues: { email: "", title: "", organisation: "" },
    });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent>
        <DialogTitle>Invite a clinician</DialogTitle>
        <DialogDescription>
          Use an email that isn’t already on Leira. We’ll send an invitation
          that expires in 7 days; after setting a password they sign in on the
          Leira mobile app.
        </DialogDescription>
        <form
          onSubmit={form.handleSubmit(async ({ email, title, organisation }) => {
            const result = await save
              .mutateAsync({
                email,
                role: "doctor",
                clinicianTitle: title,
                ...(organisation
                  ? { clinicianOrganisation: organisation }
                  : {}),
              })
              .catch(() => null);
            if (!result) return;
            const invite = result.data as StaffInviteResult | undefined;
            onSaved(
              result.preview
                ? "Preview only — no invitation was sent."
                : `Invitation sent to ${invite?.email || email}.${invite?.expiresAt ? ` The link expires on ${date(invite.expiresAt)}.` : ""}`,
            );
          })}
        >
          <fieldset disabled={save.isPending}>
            <div className="form-field">
              <Label htmlFor="clinician-email">Work email</Label>
              <Input
                id="clinician-email"
                type="email"
                {...form.register("email")}
              />
              <FieldError message={form.formState.errors.email?.message} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <Label htmlFor="invite-title">Title</Label>
                <Input
                  id="invite-title"
                  placeholder="GP, Nurse, Dietitian…"
                  {...form.register("title")}
                />
                <FieldError message={form.formState.errors.title?.message} />
              </div>
              <div className="form-field">
                <Label htmlFor="invite-organisation">
                  Organisation (optional)
                </Label>
                <Input
                  id="invite-organisation"
                  {...form.register("organisation")}
                />
                <FieldError
                  message={form.formState.errors.organisation?.message}
                />
              </div>
            </div>
          </fieldset>
          <div className="info-note">
            <Stethoscope className="mr-1.5 inline size-3.5" />
            Clinicians can only see members they’re connected with, and can’t
            sign in to this workspace.
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
              {save.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
