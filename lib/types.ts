export type UserRole = "admin" | "member";
export type ScheduleViewMode = "team-week" | "personal-month" | "personal-week" | "personal-day";
export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly";
export type ScheduleVisibility = "public" | "busy" | "private";
export type ScheduleType = "normal" | "allDay" | "period";

export interface RecurrenceRule {
  frequency: Exclude<RecurrenceFrequency, "none">;
  interval: number;
  endMode?: "until" | "count" | "never";
  until?: string;
  count?: number;
  weeklyDays?: number[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  color: string;
  mobile: string;
  sortOrder: number;
  calendarSyncToken?: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  scheduleType?: ScheduleType;
  ownerUserId: string;
  participantUserIds: string[];
  facilityIds: string[];
  memo: string;
  visibility: ScheduleVisibility;
  seriesId?: string;
  recurrenceRule?: RecurrenceRule | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleDraft {
  id?: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  scheduleType?: ScheduleType;
  ownerUserId: string;
  participantUserIds: string[];
  facilityIds: string[];
  memo: string;
  visibility: ScheduleVisibility;
  seriesId?: string;
  recurrenceRule?: RecurrenceRule | null;
}

export interface Facility {
  id: string;
  name: string;
  category: string;
  location: string;
  notes: string;
}

export interface Reservation {
  id: string;
  facilityId: string;
  title: string;
  startAt: string;
  endAt: string;
  userId: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardPost {
  id: string;
  title: string;
  body: string;
  authorUserId: string;
  pinned: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardComment {
  id: string;
  postId: string;
  body: string;
  authorUserId: string;
  createdAt: string;
}

export interface FileEntry {
  id: string;
  title: string;
  summary: string;
  folder: string;
  fileName: string;
  fileUrl: string;
  version: string;
  updatedByUserId: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
