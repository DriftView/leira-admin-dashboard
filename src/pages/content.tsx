import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUpRight, BookOpen, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useList, useSave } from "@/lib/queries";
import { date, pretty } from "@/lib/utils";
import { categories, type Tip } from "@/lib/types";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
const schema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(200),
  summary: z.string().max(400),
  content: z.string().trim().min(1, "Add the article content.").max(30000),
  category: z.enum(categories),
  status: z.enum(["draft", "published", "archived"]),
  author: z.string().trim().min(1).max(100),
  sourceName: z.string().max(200),
  sourceUrl: z.union([
    z.literal(""),
    z.url().refine((v) => /^https?:\/\//.test(v), "Use an HTTP or HTTPS URL."),
  ]),
  isDailyEligible: z.boolean(),
});
export function ContentPage() {
  const { session } = useAuth(),
    admin = session?.user.role === "admin",
    filters = useFilters(),
    query = useList<Tip>("content", filters.query),
    [selected, setSelected] = useState<Tip | "new" | null>(null),
    [notice, setNotice] = useState("");
  return (
    <>
      <Heading
        title="Good information. Healthier days."
        description="Create and curate the health tips your community sees in Leira."
      >
        {admin && (
          <Button onClick={() => setSelected("new")}>
            <Plus />
            Create health tip
          </Button>
        )}
      </Heading>
      {notice && (
        <div className="success-note" role="status">
          {notice}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>
              Health content{" "}
              <span className="count-chip">{query.data?.total ?? "—"}</span>
            </h2>
            <p>
              {admin
                ? "From first draft to everyday guidance."
                : "Browse the library. Publishing is managed by administrators."}
            </p>
          </div>
          <BookOpen size={19} className="text-muted-foreground" />
        </div>
        <Toolbar
          filters={filters}
          placeholder="Search title or author…"
          statuses={["draft", "published", "archived"]}
          onRefresh={() => void query.refetch()}
        />
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorBox error={query.error} retry={() => void query.refetch()} />
        ) : query.data.items.length ? (
          <>
            <div className="content-grid">
              {query.data.items.map((tip, i) => (
                <article className="content-card" key={tip._id}>
                  <div className={`content-cover cover-${i % 3}`}>
                    <BookOpen size={40} strokeWidth={1} />
                    <span>{pretty(tip.category)}</span>
                  </div>
                  <div className="content-body">
                    <div className="content-meta">
                      <Pill value={tip.status} />
                      <span>{date(tip.createdAt)}</span>
                    </div>
                    <h3>{tip.title}</h3>
                    <p>{tip.summary || "No summary added yet."}</p>
                    <div className="content-bottom">
                      <span>{tip.author}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(tip)}
                      >
                        {admin ? "Edit tip" : "Read tip"}
                        <ArrowUpRight />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <Pagination
              {...query.data}
              onChange={(page) => filters.set({ page: String(page) })}
            />
          </>
        ) : (
          <Empty
            title="Make room for good guidance."
            description="Create a health tip or adjust your search."
          />
        )}
      </section>
      {selected && (
        <ContentDialog
          tip={selected === "new" ? undefined : selected}
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
function ContentDialog({
  tip,
  onClose,
  onSaved,
}: {
  tip?: Tip;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { session } = useAuth(),
    admin = session?.user.role === "admin",
    save = useSave("content", tip?._id),
    form = useForm<z.infer<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: {
        title: tip?.title || "",
        summary: tip?.summary || "",
        content: tip?.content || "",
        category: tip?.category || "general_wellness",
        status: tip?.status || "draft",
        author: tip?.author || "Leira Health",
        sourceName: tip?.sourceName || "",
        sourceUrl: tip?.sourceUrl || "",
        isDailyEligible: tip?.isDailyEligible ?? true,
      },
    });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogTitle>
          {admin
            ? tip
              ? "Edit health tip"
              : "Create a health tip"
            : tip?.title}
        </DialogTitle>
        <DialogDescription>
          {admin
            ? "Published tips appear in the Leira app. Keep drafts until editorial review is complete."
            : "Health library content"}
        </DialogDescription>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            const payload = { ...values, sourceUrl: values.sourceUrl || null };
            const result = await save.mutateAsync(payload).catch(() => null);
            if (result)
              onSaved(
                result.preview
                  ? "Preview only — no content was saved."
                  : "Health tip saved.",
              );
          })}
        >
          <fieldset disabled={!admin || save.isPending}>
            {(["title", "summary"] as const).map((name) => (
              <div className="form-field" key={name}>
                <Label htmlFor={name}>
                  {name === "title" ? "Title" : "Summary"}
                </Label>
                <Input id={name} {...form.register(name)} />
                <FieldError message={form.formState.errors[name]?.message} />
              </div>
            ))}
            <div className="form-field">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                className="min-h-48"
                {...form.register("content")}
              />
              <FieldError message={form.formState.errors.content?.message} />
            </div>
            <div className="form-grid">
              <div className="form-field">
                <Label htmlFor="category">Category</Label>
                <select id="category" {...form.register("category")}>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {pretty(c)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <Label htmlFor="content-status">Status</Label>
                <select id="content-status" {...form.register("status")}>
                  {["draft", "published", "archived"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            {(["author", "sourceName", "sourceUrl"] as const).map((name) => (
              <div className="form-field" key={name}>
                <Label htmlFor={name}>
                  {name === "sourceName"
                    ? "Source name"
                    : name === "sourceUrl"
                      ? "Source URL"
                      : "Author"}
                </Label>
                <Input id={name} {...form.register(name)} />
                <FieldError message={form.formState.errors[name]?.message} />
              </div>
            ))}
            <label className="checkbox-field">
              <input type="checkbox" {...form.register("isDailyEligible")} />
              <span>Eligible for the daily health tip</span>
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
                {save.isPending ? "Saving…" : "Save health tip"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
