import { AppUser, BoardComment, BoardPost, Facility, Reservation, ScheduleItem } from "@/lib/types";

const now = "2026-03-28T09:00:00.000Z";

export const seedUsers: AppUser[] = [
  { id: "u1", name: "伊藤 義之", email: "ito@example.com", department: "営業部", role: "admin", color: "#0f766e", mobile: "090-0000-0001", sortOrder: 1 },
  { id: "u2", name: "田中 美咲", email: "tanaka@example.com", department: "管理部", role: "member", color: "#ea580c", mobile: "090-0000-0002", sortOrder: 2 },
  { id: "u3", name: "高橋 直人", email: "takahashi@example.com", department: "設計部", role: "member", color: "#2563eb", mobile: "090-0000-0003", sortOrder: 3 },
  { id: "u4", name: "山口 愛", email: "yamaguchi@example.com", department: "資材部", role: "member", color: "#7c3aed", mobile: "090-0000-0004", sortOrder: 4 },
  { id: "u5", name: "佐々木 蓮", email: "sasaki@example.com", department: "製造部", role: "member", color: "#dc2626", mobile: "090-0000-0005", sortOrder: 5 }
];

export const seedSchedules: ScheduleItem[] = [
  {
    id: "s1",
    title: "営業定例",
    startAt: "2026-03-30T10:00:00+09:00",
    endAt: "2026-03-30T11:00:00+09:00",
    ownerUserId: "u1",
    participantUserIds: ["u1", "u2"],
    facilityIds: ["f1"],
    memo: "全体進捗レビュー",
    visibility: "public",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "s2",
    title: "A社訪問",
    startAt: "2026-03-31T13:00:00+09:00",
    endAt: "2026-03-31T15:00:00+09:00",
    ownerUserId: "u1",
    participantUserIds: ["u1"],
    facilityIds: ["f4"],
    memo: "見積り提出",
    visibility: "busy",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "s3",
    title: "全社会議",
    startAt: "2026-03-30T08:45:00+09:00",
    endAt: "2026-03-30T09:15:00+09:00",
    ownerUserId: "u3",
    participantUserIds: ["u1", "u2", "u3", "u4", "u5"],
    facilityIds: ["f1"],
    memo: "Teams併用",
    visibility: "public",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "s4",
    title: "資材レビュー",
    startAt: "2026-04-02T13:00:00+09:00",
    endAt: "2026-04-02T14:30:00+09:00",
    ownerUserId: "u4",
    participantUserIds: ["u1", "u4"],
    facilityIds: ["f2"],
    memo: "仕入状況確認",
    visibility: "public",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "s5",
    title: "採用面接",
    startAt: "2026-04-03T14:00:00+09:00",
    endAt: "2026-04-03T16:00:00+09:00",
    ownerUserId: "u2",
    participantUserIds: ["u2"],
    facilityIds: ["f2"],
    memo: "オンライン",
    visibility: "private",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "s6",
    title: "製造立会い",
    startAt: "2026-04-01T09:00:00+09:00",
    endAt: "2026-04-01T12:00:00+09:00",
    ownerUserId: "u5",
    participantUserIds: ["u5"],
    facilityIds: [],
    memo: "試作品確認",
    visibility: "public",
    createdAt: now,
    updatedAt: now
  }
];

export const seedFacilities: Facility[] = [
  { id: "f1", name: "3階大会議室", category: "meeting-room", location: "3F", notes: "全社会議向け" },
  { id: "f2", name: "3階小会議室", category: "meeting-room", location: "3F", notes: "少人数向け" },
  { id: "f3", name: "2階ミーティングスペース", category: "meeting-space", location: "2F", notes: "短時間利用向け" },
  { id: "f4", name: "トラック", category: "vehicle", location: "車両", notes: "搬入・搬出用" },
  { id: "f5", name: "ハイエース", category: "vehicle", location: "車両", notes: "移動・配送用" }
];

export const seedReservations: Reservation[] = [
  { id: "r1", facilityId: "f1", title: "会議室仮押さえ", startAt: "2026-04-02T15:00:00+09:00", endAt: "2026-04-02T16:00:00+09:00", userId: "u3", memo: "試作レビュー", createdAt: now, updatedAt: now },
  { id: "r2", facilityId: "f3", title: "面談対応", startAt: "2026-03-31T10:00:00+09:00", endAt: "2026-03-31T17:00:00+09:00", userId: "u2", memo: "管理部利用", createdAt: now, updatedAt: now }
];

export const seedPosts: BoardPost[] = [
  { id: "p1", title: "4月の設備点検について", body: "設備点検は4月10日18時までに入力してください。", authorUserId: "u3", pinned: true, category: "総務", createdAt: now, updatedAt: now },
  { id: "p2", title: "スマホ版MVP確認", body: "見やすさを確認して気づいた点を共有してください。", authorUserId: "u4", pinned: false, category: "情報システム", createdAt: now, updatedAt: now }
];

export const seedComments: BoardComment[] = [
  { id: "c1", postId: "p1", body: "確認しました。営業部側でも共有します。", authorUserId: "u1", createdAt: now },
  { id: "c2", postId: "p2", body: "設備予約画面もスマホで見やすいです。", authorUserId: "u2", createdAt: now }
];
