import type { Audit, Overview, Page, SupportCase, Tip, User } from "./types";
const ago = (days: number) =>
  new Date(Date.now() - days * 86400000).toISOString();
export const demoUser: User = {
  _id: "demo-admin",
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex@example.com",
  role: "admin",
  isActive: true,
  isEmailVerified: true,
  onboardingStatus: "completed",
  createdAt: ago(90),
};
const members: User[] = [
  "Amelia Thompson",
  "Noah Williams",
  "Olivia James",
  "Liam Anderson",
  "Sophia Brown",
  "Ethan Wilson",
  "Isabella Davis",
  "James Miller",
  "Mia Taylor",
  "Lucas Martin",
  "Charlotte Lee",
  "Benjamin Clark",
].map((name, i) => ({
  ...demoUser,
  _id: `member-${i}`,
  firstName: name.split(" ")[0],
  lastName: name.split(" ")[1],
  email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
  role: "user",
  isActive: i !== 7,
  isEmailVerified: i !== 3,
  onboardingStatus: i % 4 === 3 ? "in_progress" : "completed",
  createdAt: ago(i),
  lastLoginAt: ago(i / 2),
}));
const cases: SupportCase[] = [
  {
    _id: "CASE-1042",
    userId: "member-0",
    title: "Apple Health is not syncing",
    description:
      "Sample request: my recent activity is not appearing after reconnecting Apple Health. Could you help me check my connection?",
    category: "technical",
    priority: "high",
    status: "open",
    createdAt: ago(0),
  },
  {
    _id: "CASE-1041",
    userId: "member-2",
    title: "Help updating my account details",
    description:
      "Sample request: I would like help updating the name on my account.",
    category: "account",
    priority: "medium",
    status: "in_progress",
    createdAt: ago(1),
  },
  {
    _id: "CASE-1040",
    userId: "member-4",
    title: "Medication reminder preferences",
    description: "Sample request: how can I change my reminder times?",
    category: "technical",
    priority: "low",
    status: "open",
    createdAt: ago(1),
  },
  {
    _id: "CASE-1039",
    userId: "member-6",
    title: "Unable to sign in on a new device",
    description:
      "Sample request: I need help accessing my account on a new phone.",
    category: "account",
    priority: "urgent",
    status: "open",
    createdAt: ago(2),
  },
  {
    _id: "CASE-1038",
    userId: "member-8",
    title: "A suggestion for the activity screen",
    description: "Sample request: I would love a weekly view of my activity.",
    category: "feature_request",
    priority: "low",
    status: "resolved",
    resolution: "Feedback recorded for the product team.",
    createdAt: ago(4),
  },
];
const tips: Tip[] = [
  {
    _id: "tip-1",
    title: "Small steps, stronger habits",
    summary: "Make space for movement in your everyday routine.",
    content:
      "Sample editorial content for preview only. Add your reviewed health guidance here before publishing.",
    category: "exercise",
    status: "published",
    author: "Leira Health",
    tags: [],
    isDailyEligible: true,
    createdAt: ago(2),
  },
  {
    _id: "tip-2",
    title: "A calmer end to your day",
    summary: "A little intention for your evening routine.",
    content: "Sample editorial draft for preview only.",
    category: "sleep",
    status: "draft",
    author: "Leira Health",
    tags: [],
    isDailyEligible: true,
    createdAt: ago(3),
  },
  {
    _id: "tip-3",
    title: "Getting to know your heart",
    summary: "Build confidence in your everyday health journey.",
    content: "Sample editorial content for preview only.",
    category: "heart_health",
    status: "published",
    author: "Leira Health",
    tags: [],
    isDailyEligible: false,
    createdAt: ago(5),
  },
];
const audit: Audit[] = [
  {
    _id: "audit-1",
    actorName: "Alex Morgan",
    action: "content.updated",
    resource: "health_tip",
    resourceId: "tip-1",
    fields: ["title", "status"],
    createdAt: ago(0),
  },
  {
    _id: "audit-2",
    actorName: "Jordan Lee",
    action: "case.updated",
    resource: "support_case",
    resourceId: "CASE-1038",
    fields: ["status", "resolution"],
    createdAt: ago(1),
  },
];
export function demoOverview(days: number, support: boolean): Overview {
  const points = Array.from({ length: days }, (_, i) => ({
    date: ago(days - i - 1).slice(0, 10),
    count: Math.round(8 + (i % 8) * 2 + i / 3),
  }));
  const base = {
    days,
    generatedAt: ago(0),
    caseStatuses: [
      { _id: "open", count: 14 },
      { _id: "in_progress", count: 8 },
      { _id: "resolved", count: 41 },
      { _id: "closed", count: 19 },
    ],
    urgentCases: 4,
    caseTrend: points.map((p) => ({ ...p, count: Math.round(p.count / 5) })),
  };
  return support
    ? base
    : {
        ...base,
        members: 1248,
        active: 986,
        verified: 1124,
        onboarded: 1048,
        registrations: points,
        contentStatuses: [
          { _id: "published", count: 28 },
          { _id: "draft", count: 6 },
          { _id: "archived", count: 3 },
        ],
      };
}
export function demoList<T>(
  resource: string,
  params: URLSearchParams,
): Page<T> {
  const source =
    resource === "members"
      ? members
      : resource === "support-cases"
        ? cases
        : resource === "content"
          ? tips
          : resource === "staff"
            ? [
                demoUser,
                {
                  ...demoUser,
                  _id: "demo-support",
                  firstName: "Jordan",
                  lastName: "Lee",
                  email: "jordan@example.com",
                  role: "support",
                },
              ]
            : audit;
  const search = (params.get("search") || "").toLowerCase(),
    status = params.get("status"),
    priority = params.get("priority");
  const items = source.filter(
    (item) =>
      JSON.stringify(item).toLowerCase().includes(search) &&
      (!status || ("status" in item && item.status === status)) &&
      (!priority || ("priority" in item && item.priority === priority)),
  );
  const page = Number(params.get("page") || 1),
    limit = Number(params.get("limit") || 10);
  return {
    items: items.slice((page - 1) * limit, page * limit) as T[],
    total: items.length,
    page,
    limit,
  };
}
