import {
  ArrowLeft,
  ArrowRight,
  HeartPulse,
  Search,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn, date, pretty } from "@/lib/utils";
export function Brand() {
  return (
    <div className="brand">
      <HeartPulse strokeWidth={1.8} />
      <span>
        leira<span className="brand-label">ADMIN WORKSPACE</span>
      </span>
    </div>
  );
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const [today] = useState(() => new Date().toISOString());
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">A LITTLE CLARITY. BETTER CARE.</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">
        {children || <span className="date-chip">{date(today)}</span>}
      </div>
    </div>
  );
}
export function Pill({ value }: { value: string }) {
  const green = [
      "active",
      "completed",
      "published",
      "resolved",
      "closed",
      "accepting",
    ].includes(value),
    red = ["urgent", "high", "inactive"].includes(value),
    amber = [
      "open",
      "in_progress",
      "draft",
      "pending",
      "requested",
    ].includes(value);
  return (
    <span
      className={cn(
        "pill",
        green && "pill-green",
        red && "pill-red",
        amber && "pill-amber",
      )}
    >
      <span className="pill-dot" />
      {pretty(value)}
    </span>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <span>{error.message}</span>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <RefreshCw className="size-5 animate-spin" />
      <span>Getting your workspace ready…</span>
    </div>
  );
}
export function Empty({
  title = "Nothing here just yet.",
  description = "Try a different search or clear your filters.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <Inbox />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Avatar({ first, last }: { first: string; last: string }) {
  return (
    <span className="avatar" aria-hidden="true">
      {first[0]}
      {last[0]}
    </span>
  );
}
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const query = new URLSearchParams({
    page: params.get("page") || "1",
    limit: "10",
  });
  for (const key of ["search", "status", "priority"])
    if (params.get(key)) query.set(key, params.get(key)!);
  return {
    params,
    query,
    set: (values: Record<string, string>) => {
      const next = new URLSearchParams(params);
      Object.entries(values).forEach(([key, value]) =>
        value ? next.set(key, value) : next.delete(key),
      );
      setParams(next);
    },
    clear: () => setParams({}),
  };
}
export function Toolbar({
  filters,
  placeholder,
  statuses,
  onRefresh,
}: {
  filters: ReturnType<typeof useFilters>;
  placeholder: string;
  statuses?: string[];
  onRefresh: () => void;
}) {
  return (
    <form
      className="table-toolbar"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        filters.set({
          search: String(data.get("search") || "").trim(),
          page: "1",
        });
      }}
    >
      <div className="search-input">
        <Search size={16} />
        <Input
          key={filters.params.get("search")}
          name="search"
          aria-label={placeholder}
          placeholder={placeholder}
          maxLength={100}
          defaultValue={filters.params.get("search") || ""}
        />
      </div>
      {statuses && (
        <select
          aria-label="Filter by status"
          value={filters.params.get("status") || ""}
          onChange={(e) => filters.set({ status: e.target.value, page: "1" })}
        >
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {pretty(status)}
            </option>
          ))}
        </select>
      )}
      <Button variant="outline" type="submit">
        Search
      </Button>
      {["search", "status"].some((k) => filters.params.has(k)) && (
        <Button type="button" variant="ghost" onClick={filters.clear}>
          Clear
        </Button>
      )}
      <Button
        type="button"
        className="ml-auto"
        variant="ghost"
        size="icon"
        aria-label="Refresh results"
        onClick={onRefresh}
      >
        <RefreshCw />
      </Button>
    </form>
  );
}
export function Pagination({
  total,
  page,
  limit,
  onChange,
}: {
  total: number;
  page: number;
  limit: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total.toLocaleString()}`
          : "No results"}
      </span>
      <div>
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ArrowLeft /> Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page * limit >= total}
          onClick={() => onChange(page + 1)}
        >
          Next <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
export function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="field-error" role="alert">
      {message}
    </p>
  ) : null;
}
