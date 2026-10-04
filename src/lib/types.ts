export type Role = "admin" | "support" | "user" | "doctor";
export type User = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  onboardingStatus: string;
  createdAt: string;
  lastLoginAt?: string;
};
export type StaffInvite = {
  email: string;
  role: Role;
  expiresAt: string;
};
// POST /admin/staff returns this instead of the user when the email had no
// Leira account and an invitation was emailed.
export type StaffInviteResult = StaffInvite & { invited: true };
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
export type CaseStatus = "open" | "in_progress" | "resolved" | "closed";
export type Priority = "low" | "medium" | "high" | "urgent";
export type SupportCase = {
  _id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: CaseStatus;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
  attachments?: string[];
};
export const categories = [
  "nutrition",
  "exercise",
  "mental_health",
  "sleep",
  "heart_health",
  "respiratory",
  "general_wellness",
  "chronic_conditions",
  "preventive_care",
  "womens_health",
  "mens_health",
] as const;
export type Tip = {
  _id: string;
  title: string;
  content: string;
  summary: string;
  category: (typeof categories)[number];
  author: string;
  status: "draft" | "published" | "archived";
  sourceName?: string;
  sourceUrl?: string | null;
  createdAt: string;
  tags: string[];
  isDailyEligible: boolean;
};
export type Audit = {
  _id: string;
  actorName: string;
  action: string;
  resource: string;
  resourceId: string;
  fields: string[];
  createdAt: string;
};
export type Point = { date: string; count: number };
export type Overview = {
  days: number;
  generatedAt: string;
  caseStatuses: { _id: string; count: number }[];
  urgentCases: number;
  caseTrend: Point[];
  members?: number;
  active?: number;
  verified?: number;
  onboarded?: number;
  contentStatuses?: { _id: string; count: number }[];
  registrations?: Point[];
};
// Care team: clinicians are "doctor" accounts that sign in on the mobile app.
// The care-team endpoints return `id` rather than Mongo's `_id`.
export type Clinician = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  title?: string | null;
  organisation?: string | null;
  acceptingPatients: boolean;
  patientCount: number;
  lastLoginAt?: string | null;
};
export type CareLinkStatus = "requested" | "active" | "declined" | "ended";
export type CarePerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};
export type CareLink = {
  id: string;
  status: CareLinkStatus;
  origin: "patient" | "admin";
  requestNote?: string | null;
  declineReason?: string | null;
  patient: CarePerson;
  // A patient request has no clinician until an administrator approves it.
  clinician: CarePerson | null;
  startedAt?: string | null;
  endedAt?: string | null;
  endedBy?: string | null;
  createdAt: string;
};
export type Session = { token: string; user: User; demo: boolean };
