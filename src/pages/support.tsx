import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, MessageSquare } from "lucide-react";
import { useList, useSave } from "@/lib/queries";
import { date, pretty } from "@/lib/utils";
import type { SupportCase } from "@/lib/types";
import {
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
const statuses = ["open", "in_progress", "resolved", "closed"] as const,
  priorities = ["low", "medium", "high", "urgent"] as const;
const schema = z.object({
  status: z.enum(statuses),
  priority: z.enum(priorities),
  resolution: z.string().max(4000),
});
export function SupportPage() {
  const filters = useFilters(),
    query = useList<SupportCase>("support-cases", filters.query),
    [selected, setSelected] = useState<SupportCase | null>(null),
    [notice, setNotice] = useState("");
  return (
    <>
      <Heading
        title="A little support goes a long way."
        description="Keep requests moving and make every member feel heard."
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
              Support inbox{" "}
              <span className="count-chip">{query.data?.total ?? "—"}</span>
            </h2>
            <p>One place for a helping hand.</p>
          </div>
          <MessageSquare className="text-muted-foreground" size={19} />
        </div>
        <Toolbar
          filters={filters}
          placeholder="Search case title…"
          statuses={[...statuses]}
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
                    <th>Request</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <strong>{c.title}</strong>
                        <small className="cell-subtitle">
                          {pretty(c.category)} · #
                          {c._id.slice(-6).toUpperCase()}
                        </small>
                      </td>
                      <td>
                        <Pill value={c.priority} />
                      </td>
                      <td>
                        <Pill value={c.status} />
                      </td>
                      <td className="muted-cell">{date(c.createdAt)}</td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelected(c)}
                        >
                          Review <ArrowRight />
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
          <Empty
            title="You’re all caught up."
            description="No requests match your current filters."
          />
        )}
      </section>
      {selected && (
        <CaseDialog
          item={selected}
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
function CaseDialog({
  item,
  onClose,
  onSaved,
}: {
  item: SupportCase;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const save = useSave("support-cases", item._id),
    form = useForm<z.infer<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: {
        status: item.status,
        priority: item.priority,
        resolution: item.resolution || "",
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
        <div className="eyebrow">CASE #{item._id.slice(-6).toUpperCase()}</div>
        <DialogTitle>{item.title}</DialogTitle>
        <DialogDescription>
          Received {date(item.createdAt)} · {pretty(item.category)}
        </DialogDescription>
        <div className="case-description">{item.description}</div>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const result = await save.mutateAsync(values).catch(() => null);
            if (result)
              onSaved(
                result.preview
                  ? "Preview only — no support case was changed."
                  : "Support case updated. Changes are visible in the member’s app.",
              );
          })}
        >
          <fieldset disabled={save.isPending}>
            <div className="form-grid">
              <div className="form-field">
                <Label htmlFor="case-status">Status</Label>
                <select id="case-status" {...form.register("status")}>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {pretty(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <Label htmlFor="priority">Priority</Label>
                <select id="priority" {...form.register("priority")}>
                  {priorities.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-field">
              <Label htmlFor="resolution">Resolution note</Label>
              <Textarea
                id="resolution"
                placeholder="Describe the outcome and any next steps…"
                {...form.register("resolution")}
              />
              <small className="field-help">
                Visible to the member in their support case.
              </small>
              <FieldError message={form.formState.errors.resolution?.message} />
            </div>
          </fieldset>
          {save.error && <ErrorBox error={save.error} />}
          <div className="form-actions">
            <Button
              variant="outline"
              type="button"
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
