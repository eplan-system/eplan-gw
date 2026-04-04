import { AppUser, BoardComment, BoardPost, Facility, FileEntry, Reservation, ScheduleItem } from "@/lib/types";

const now = "2026-03-28T09:00:00.000Z";

export const seedUsers: AppUser[] = [
  { id: "u1", name: "伊藤 拓也", email: "ito@example.com", department: "総務部", role: "admin", color: "#0f766e", mobile: "090-0000-0001", sortOrder: 1 },
  { id: "u2", name: "田中 彩", email: "tanaka@example.com", department: "営業部", role: "member", color: "#ea580c", mobile: "090-0000-0002", sortOrder: 2 },
  { id: "u3", name: "高橋 恒一", email: "takahashi@example.com", department: "設計部", role: "member", color: "#2563eb", mobile: "090-0000-0003", sortOrder: 3 },
  { id: "u4", name: "山口 健", email: "yamaguchi@example.com", department: "情報システム", role: "member", color: "#7c3aed", mobile: "090-0000-0004", sortOrder: 4 },
  { id: "u5", name: "佐々木 望", email: "sasaki@example.com", department: "製造部", role: "member", color: "#dc2626", mobile: "090-0000-0005", sortOrder: 5 }
];

export const seedSchedules: ScheduleItem[] = [
  {
    id: "s1",
    title: "総務部 定例会議",
    startAt: "2026-03-30T10:00:00+09:00",
    endAt: "2026-03-30T11:00:00+09:00",
    ownerUserId: "u1",
    participantUserIds: ["u1", "u2"],
    facilityIds: ["f1"],
    memo: "来月の備品更新について確認",
    visibility: "public",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "s2",
    title: "A社 訪問",
    startAt: "2026-03-31T13:00:00+09:00",
    endAt: "2026-03-31T15:00:00+09:00",
    ownerUserId: "u1",
    participantUserIds: ["u1"],
    facilityIds: ["f4"],
    memo: "提案内容の最終確認",
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
    memo: "Teams 併用",
    visibility: "public",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "s4",
    title: "製造レビュー",
    startAt: "2026-04-02T13:00:00+09:00",
    endAt: "2026-04-02T14:30:00+09:00",
    ownerUserId: "u4",
    participantUserIds: ["u1", "u4"],
    facilityIds: ["f2"],
    memo: "現場状況の共有",
    visibility: "public",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "s5",
    title: "採用面談",
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
    title: "製造部 立会い",
    startAt: "2026-04-01T09:00:00+09:00",
    endAt: "2026-04-01T12:00:00+09:00",
    ownerUserId: "u5",
    participantUserIds: ["u5"],
    facilityIds: [],
    memo: "試運転の確認",
    visibility: "public",
    createdAt: now,
    updatedAt: now
  }
];

export const seedFacilities: Facility[] = [
  { id: "f1", name: "3F 大会議室", category: "meeting-room", location: "3F", notes: "全社会議向け" },
  { id: "f2", name: "3F 小会議室", category: "meeting-room", location: "3F", notes: "4名まで" },
  { id: "f3", name: "2F ミーティングスペース", category: "meeting-space", location: "2F", notes: "短時間向け" },
  { id: "f4", name: "トラック", category: "vehicle", location: "車庫", notes: "共同利用" },
  { id: "f5", name: "ハイエース", category: "vehicle", location: "車庫", notes: "移動用" }
];

export const seedReservations: Reservation[] = [
  { id: "r1", facilityId: "f1", title: "会議室押さえ", startAt: "2026-04-02T15:00:00+09:00", endAt: "2026-04-02T16:00:00+09:00", userId: "u3", memo: "試作レビュー", createdAt: now, updatedAt: now },
  { id: "r2", facilityId: "f3", title: "面談対応", startAt: "2026-03-31T10:00:00+09:00", endAt: "2026-03-31T17:00:00+09:00", userId: "u2", memo: "営業採用", createdAt: now, updatedAt: now }
];

export const seedPosts: BoardPost[] = [
  {
    id: "p1",
    title: "4月の設備点検について",
    body: "設備点検を4月10日 18:00までに実施してください。対象と手順はファイル管理の点検表を確認してください。",
    authorUserId: "u3",
    pinned: true,
    category: "総務",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "p2",
    title: "スマホVPN手順を更新しました",
    body: "接続方式を見直したため、旧手順は使用しないでください。差分はファイル管理の VPN フォルダにまとめています。",
    authorUserId: "u4",
    pinned: false,
    category: "情報システム",
    createdAt: now,
    updatedAt: now
  }
];

export const seedComments: BoardComment[] = [
  { id: "c1", postId: "p1", body: "確認しました。営業部でも今週中に対応します。", authorUserId: "u1", createdAt: now },
  { id: "c2", postId: "p2", body: "更新版で接続できました。旧版は回収しておきます。", authorUserId: "u2", createdAt: now }
];

export const seedFiles: FileEntry[] = [
  {
    id: "file-1",
    title: "VPN接続手順",
    summary: "社外から社内ネットワークへ接続するための最新版手順です。",
    folder: "情報システム/ネットワーク",
    fileName: "vpn-manual-v3.pdf",
    fileUrl: "\\\\intra-server\\shared\\it\\vpn\\vpn-manual-v3.pdf",
    version: "v3.0",
    updatedByUserId: "u4",
    tags: ["VPN", "手順書", "最新版"],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "file-2",
    title: "見積書テンプレート",
    summary: "営業向けの最新版テンプレートです。旧様式は使用停止です。",
    folder: "営業/テンプレート",
    fileName: "quotation-template-2026.xlsx",
    fileUrl: "\\\\intra-server\\shared\\sales\\template\\quotation-template-2026.xlsx",
    version: "2026.04",
    updatedByUserId: "u2",
    tags: ["営業", "テンプレート"],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "file-3",
    title: "入退社チェックリスト",
    summary: "総務用の入退社対応チェックリストです。",
    folder: "総務/手続き",
    fileName: "onboarding-checklist.docx",
    fileUrl: "\\\\intra-server\\shared\\ga\\hr\\onboarding-checklist.docx",
    version: "v1.4",
    updatedByUserId: "u1",
    tags: ["総務", "人事"],
    createdAt: now,
    updatedAt: now
  }
];
