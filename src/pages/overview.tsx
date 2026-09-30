import { useId, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CircleCheck,
  HeartPulse,
  LifeBuoy,
  Users,
  Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useList, useOverview } from "@/lib/queries";
import { number, date, pretty } from "@/lib/utils";
import type { Point, SupportCase, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  Empty,
  ErrorBox,
  Heading,
  Loading,
  Pill,
} from "@/components/shared";

export function Trend({
  points,
  title,
  description,
}: {
  points: Point[];
  title: string;
  description: string;
}) {
  const id = useId(),
    max = Math.max(1, ...points.map((p) => p.count)),
    total = points.reduce((a, p) => a + p.count, 0);
  const coords = points
    .map(
      (p, i) =>
        `${(i / (points.length - 1)) * 600},${150 - (p.count / max) * 120}`,
    )
    .join(" ");
  return (
    <section className="panel trend-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="chart-key">
          <i />
          Daily total
        </span>
      </div>
      <div className="chart-stat">
        {number(total)}
        <span>in this period</span>
      </div>
      <div className="trend-chart">
        <div className="chart-scale">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <svg
          viewBox="0 0 600 170"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${title}: ${total} total over ${points.length} days`}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d40035" stopOpacity=".16" />
              <stop offset="100%" stopColor="#d40035" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[30, 90, 150].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="600"
              y2={y}
              stroke="#eeedf2"
              strokeDasharray="4 5"
            />
          ))}
          <polygon points={`0,150 ${coords} 600,150`} fill={`url(#${id})`} />
          <polyline
            points={coords}
            fill="none"
            stroke="#d40035"
            strokeWidth="2.8"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((p, i) => (
            <circle
              key={p.date}
              cx={(i / (points.length - 1)) * 600}
              cy={150 - (p.count / max) * 120}
              r="3"
              fill="#d40035"
              opacity="0"
            >
              <title>
                {p.date}: {p.count}
              </title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="chart-dates">
        {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
          <span key={i}>{date(points[i]?.date)}</span>
        ))}
      </div>
      <details className="chart-data">
        <summary>View daily values</summary>
        <div className="chart-data-grid">
          {points.map((p) => (
            <span key={p.date}>
              {p.date}
              <strong>{p.count}</strong>
            </span>
          ))}
        </div>
      </details>
    </section>
  );
}
export function OverviewPage({ analytics = false }: { analytics?: boolean }) {
  const { session } = useAuth(),
    admin = session?.user.role === "admin",
    [days, setDays] = useState(30);
  const stats = useOverview(days),
    members = useList<User>("members", new URLSearchParams({ limit: "5" })),
    cases = useList<SupportCase>(
      "support-cases",
      new URLSearchParams({ limit: "4", status: "open" }),
    );
  const s = stats.data,
    open =
      s?.caseStatuses
        .filter((v) => ["open", "in_progress"].includes(v._id))
        .reduce((a, v) => a + v.count, 0) || 0,
    resolved =
      s?.caseStatuses
        .filter((v) => ["resolved", "closed"].includes(v._id))
        .reduce((a, v) => a + v.count, 0) || 0;
  const metrics = admin
    ? [
        {
          label: "Total members",
          value: s?.members || 0,
          note: "Registered community members",
          icon: Users,
          featured: true,
        },
        {
          label: "Active members",
          value: s?.active || 0,
          note: `Signed in over the last ${days} days`,
          icon: Activity,
        },
        {
          label: "Open support cases",
          value: open,
          note: "Open and in progress",
          icon: LifeBuoy,
        },
        {
          label: "Published content",
          value:
            s?.contentStatuses?.find((v) => v._id === "published")?.count || 0,
          note: "Health tips in the Leira app",
          icon: BookOpen,
        },
      ]
    : [
        {
          label: "Open support cases",
          value: open,
          note: "Open and in progress",
          icon: LifeBuoy,
          featured: true,
        },
        {
          label: "Needs attention",
          value: s?.urgentCases || 0,
          note: "High or urgent unresolved cases",
          icon: HeartPulse,
        },
        {
          label: "Resolved & closed",
          value: resolved,
          note: "All-time completed cases",
          icon: CircleCheck,
        },
        {
          label: "New requests",
          value: s?.caseTrend.reduce((a, p) => a + p.count, 0) || 0,
          note: `Received in the last ${days} days`,
          icon: Activity,
        },
      ];
  return (
    <>
      <Heading
        title={
          analytics
            ? "A clearer view of your impact."
            : `Good to see you, ${session?.user.firstName}.`
        }
        description={
          analytics
            ? "Understand the trends behind your community and support operations."
            : "Here’s what’s happening across your Leira community today."
        }
      >
        <select
          aria-label="Reporting period"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {[7, 30, 90].map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </Heading>
      {stats.isPending ? (
        <Loading />
      ) : stats.error ? (
        <ErrorBox error={stats.error} retry={() => void stats.refetch()} />
      ) : (
        s && (
          <>
            <section className="metrics-grid" aria-label="Key metrics">
              {metrics.map((m) => (
                <article
                  key={m.label}
                  className={`metric-card ${m.featured ? "metric-featured" : ""}`}
                >
                  <div className="metric-label">
                    {m.label}
                    <span>
                      <m.icon size={18} />
                    </span>
                  </div>
                  <strong>{number(m.value)}</strong>
                  <div className="metric-note">
                    {m.featured ? (
                      <span className="tiny-dot" />
                    ) : (
                      <span className="metric-line" />
                    )}
                    {m.note}
                  </div>
                </article>
              ))}
            </section>
            <div className="overview-grid">
              <Trend
                points={admin ? s.registrations || [] : s.caseTrend}
                title={
                  admin ? "A growing community" : "Here when members need us"
                }
                description={
                  admin
                    ? "New member registrations over time"
                    : "Incoming support requests over time"
                }
              />
              <section className="panel readiness-panel">
                <div className="panel-heading">
                  <div>
                    <h2>{admin ? "A healthy start" : "Support at a glance"}</h2>
                    <p>
                      {admin
                        ? "Helping members find their feet"
                        : "Where your conversations stand"}
                    </p>
                  </div>
                  <span className="soft-icon">
                    <HeartPulse size={18} />
                  </span>
                </div>
                <div className="readiness-body">
                  {admin
                    ? [
                        ["Email verified", s.verified || 0],
                        ["Onboarding complete", s.onboarded || 0],
                      ].map(([label, count]) => (
                        <div className="progress-item" key={label}>
                          <div>
                            <span>{label}</span>
                            <strong>
                              {s.members
                                ? Math.round((Number(count) / s.members) * 100)
                                : 0}
                              %
                            </strong>
                          </div>
                          <progress
                            max={s.members || 1}
                            value={Number(count)}
                            aria-label={String(label)}
                          />
                          <small>
                            {number(Number(count))} of {number(s.members || 0)}{" "}
                            members
                          </small>
                        </div>
                      ))
                    : s.caseStatuses.map((row) => (
                        <div className="status-summary" key={row._id}>
                          <Pill value={row._id} />
                          <strong>{number(row.count)}</strong>
                        </div>
                      ))}
                  <div className="support-callout">
                    <div className="callout-icon">
                      <LifeBuoy size={18} />
                    </div>
                    <div>
                      <strong>
                        {number(s.urgentCases)} cases need attention
                      </strong>
                      <p>High or urgent requests awaiting resolution.</p>
                    </div>
                    <Link to="/support" aria-label="Review support inbox">
                      <ArrowUpRight size={18} />
                    </Link>
                  </div>
                </div>
              </section>
            </div>
            {analytics ? (
              <div className="overview-grid">
                <Trend
                  points={s.caseTrend}
                  title="Support demand"
                  description="Requests created during this reporting period"
                />
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {admin ? "Content library" : "Case status breakdown"}
                      </h2>
                      <p>Current totals across your workspace</p>
                    </div>
                  </div>
                  <div className="readiness-body">
                    {(admin ? s.contentStatuses || [] : s.caseStatuses).map(
                      (row) => (
                        <div className="status-summary" key={row._id}>
                          <Pill value={row._id} />
                          <strong>{number(row.count)}</strong>
                        </div>
                      ),
                    )}
                  </div>
                </section>
              </div>
            ) : admin ? (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>The newest faces in Leira</h2>
                    <p>A warm welcome to our newest members</p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/members">
                      View all members <ArrowRight />
                    </Link>
                  </Button>
                </div>
                {members.error ? (
                  <ErrorBox
                    error={members.error}
                    retry={() => void members.refetch()}
                  />
                ) : members.isPending ? (
                  <Loading />
                ) : members.data.items.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Member</th>
                          <th>Account status</th>
                          <th>Onboarding</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.data.items.map((u) => (
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
                                value={u.isActive ? "active" : "inactive"}
                              />
                            </td>
                            <td>
                              <Pill value={u.onboardingStatus} />
                            </td>
                            <td className="muted-cell">{date(u.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Your community starts here."
                    description="New members will appear when they register in Leira."
                  />
                )}
              </section>
            ) : (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Ready for a helping hand</h2>
                    <p>Latest open requests</p>
                  </div>
                  <Button asChild variant="ghost">
                    <Link to="/support">
                      Open inbox <ArrowRight />
                    </Link>
                  </Button>
                </div>
                {cases.error ? (
                  <ErrorBox
                    error={cases.error}
                    retry={() => void cases.refetch()}
                  />
                ) : cases.isPending ? (
                  <Loading />
                ) : cases.data.items.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Request</th>
                          <th>Priority</th>
                          <th>Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cases.data.items.map((c) => (
                          <tr key={c._id}>
                            <td>
                              <strong>{c.title}</strong>
                              <small className="cell-subtitle">
                                {pretty(c.category)}
                              </small>
                            </td>
                            <td>
                              <Pill value={c.priority} />
                            </td>
                            <td>{date(c.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="You’re all caught up."
                    description="New requests will appear here."
                  />
                )}
              </section>
            )}
            <div className="updated-at">
              Updated{" "}
              {new Date(s.generatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {days}-day reporting window
            </div>
          </>
        )
      )}
    </>
  );
}
