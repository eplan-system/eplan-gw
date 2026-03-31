"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
  ,
  updatePassword as firebaseUpdatePassword
} from "firebase/auth";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { seedComments, seedFacilities, seedPosts, seedReservations, seedSchedules, seedUsers } from "@/lib/demo-data";
import { AppUser, BoardComment, BoardPost, Facility, Reservation, ScheduleDraft, ScheduleItem } from "@/lib/types";
import { uid } from "@/lib/utils";

const keys = {
  users: "demo-users",
  schedules: "demo-schedules",
  facilities: "demo-facilities",
  reservations: "demo-reservations",
  posts: "demo-posts",
  comments: "demo-comments",
  session: "demo-session"
};

type Snapshot = {
  users: AppUser[];
  schedules: ScheduleItem[];
  facilities: Facility[];
  reservations: Reservation[];
  posts: BoardPost[];
  comments: BoardComment[];
};

const CALENDAR_SYNC_MONTHS = 3;

function removeUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedDeep(item)).filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, removeUndefinedDeep(item)] as const);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

function fallbackFirebaseProfile(
  firebaseUser: { uid: string; email: string | null; displayName: string | null },
  role: AppUser["role"] = "member",
  sortOrder = 99
): AppUser {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || (firebaseUser.email?.split("@")[0] ?? "user"),
    email: firebaseUser.email ?? "",
    department: "未設定",
    role,
    color: "#0b7661",
    mobile: "",
    sortOrder
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: () => T | Promise<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(async () => resolve(await fallback()), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function readSeed<T>(key: string, seed: T): T {
  const raw = window.localStorage.getItem(key);
  if (raw) return JSON.parse(raw) as T;
  window.localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function writeSeed<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readDemoStore(): Snapshot {
  return {
    users: readSeed(keys.users, seedUsers),
    schedules: readSeed(keys.schedules, seedSchedules),
    facilities: readSeed(keys.facilities, seedFacilities),
    reservations: readSeed(keys.reservations, seedReservations),
    posts: readSeed(keys.posts, seedPosts),
    comments: readSeed(keys.comments, seedComments)
  };
}

function addMonths(base: Date, months: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

function buildCalendarSyncToken() {
  const tokenBase =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : `${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
  return `sync_${tokenBase}`;
}

function buildCalendarSyncUrl(token: string, origin?: string) {
  const base =
    origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://eplan-gw.vercel.app");
  return `${base.replace(/\/$/, "")}/api/calendar-feed/${token}`;
}

function buildCalendarWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = addMonths(start, CALENDAR_SYNC_MONTHS);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function scheduleInCalendarWindow(schedule: ScheduleItem) {
  const { start, end } = buildCalendarWindow();
  const scheduleStart = new Date(schedule.startAt);
  return scheduleStart >= start && scheduleStart <= end;
}

function scheduleForUser(schedule: ScheduleItem, userId: string) {
  return schedule.ownerUserId === userId || schedule.participantUserIds.includes(userId);
}

async function deleteCalendarFeed(token: string) {
  if (!db) return;
  const firestore = db;

  const itemsSnapshot = await getDocs(collection(firestore, "CalendarFeeds", token, "Items"));
  await Promise.all(itemsSnapshot.docs.map((item) => deleteDoc(doc(firestore, "CalendarFeeds", token, "Items", item.id))));
  await deleteDoc(doc(firestore, "CalendarFeeds", token));
}

async function syncCalendarFeedForUser(user: AppUser, schedules: ScheduleItem[]) {
  if (!isFirebaseConfigured || !db || !user.calendarSyncToken) return;
  const firestore = db;

  const token = user.calendarSyncToken;
  const feedSchedules = schedules.filter((schedule) => scheduleForUser(schedule, user.id) && scheduleInCalendarWindow(schedule));
  const itemsCollection = collection(firestore, "CalendarFeeds", token, "Items");
  const existingItems = await getDocs(itemsCollection);
  const nextIds = new Set(feedSchedules.map((schedule) => schedule.id));

  await Promise.all(
    existingItems.docs
      .filter((item) => !nextIds.has(item.id))
      .map((item) => deleteDoc(doc(firestore, "CalendarFeeds", token, "Items", item.id)))
  );

  await Promise.all(
    feedSchedules.map((schedule) =>
      setDoc(doc(firestore, "CalendarFeeds", token, "Items", schedule.id), {
        id: schedule.id,
        title: schedule.title,
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        memo: schedule.memo,
        visibility: schedule.visibility,
        ownerUserId: schedule.ownerUserId,
        participantUserIds: schedule.participantUserIds,
        updatedAt: schedule.updatedAt,
        createdAt: schedule.createdAt
      })
    )
  );

  await setDoc(doc(firestore, "CalendarFeeds", token), {
    token,
    userId: user.id,
    userName: user.name,
    updatedAt: new Date().toISOString()
  });
}

async function syncCalendarFeedsForUsers(userIds: string[], schedules?: ScheduleItem[]) {
  if (!isFirebaseConfigured || !db || userIds.length === 0) return;

  const [users, sourceSchedules] = await Promise.all([listUsers(), schedules ? Promise.resolve(schedules) : listSchedules()]);
  const targets = users.filter((user) => userIds.includes(user.id) && user.calendarSyncToken);
  await Promise.all(targets.map((user) => syncCalendarFeedForUser(user, sourceSchedules)));
}

async function readCollection<T>(name: string): Promise<T[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, name));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function listUsers() {
  if (!isFirebaseConfigured) {
    return readDemoStore().users;
  }

  try {
    const users = await readCollection<AppUser>("Users");
    if (users.length > 0) {
      return users;
    }
  } catch {
    // ignore and fall through to auth fallback
  }

  if (auth?.currentUser) {
    return [
      fallbackFirebaseProfile(
        {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName
        },
        "admin",
        1
      )
    ];
  }

  return [];
}

async function ensureFirebaseUserProfile(firebaseUser: { uid: string; email: string | null; displayName: string | null }) {
  const users = await withTimeout(listUsers(), 4000, () => []);
  const existing = users.find((item) => item.email === firebaseUser.email);
  if (existing) {
    return existing;
  }

  const nextUser = fallbackFirebaseProfile(firebaseUser, users.length === 0 ? "admin" : "member", users.length + 1);

  try {
    await withTimeout(setDoc(doc(db!, "Users", nextUser.id), nextUser), 4000, () => undefined);
  } catch {
    return nextUser;
  }

  return nextUser;
}

export async function signIn(email: string, password: string): Promise<AppUser | null> {
  if (isFirebaseConfigured && auth) {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return ensureFirebaseUserProfile({
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName
    });
  }

  const users = readSeed(keys.users, seedUsers);
  const matched = users.find((user) => user.email === email) ?? users[0];
  window.localStorage.setItem(keys.session, matched.id);
  return matched;
}

export async function bootstrapFirstAdmin(email: string, password: string): Promise<AppUser> {
  if (!isFirebaseConfigured || !auth) {
    const users = readSeed(keys.users, seedUsers);
    const first = users[0];
    window.localStorage.setItem(keys.session, first.id);
    return first;
  }

  await setPersistence(auth, browserLocalPersistence);
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const profile = await ensureFirebaseUserProfile({
    uid: credential.user.uid,
    email: credential.user.email,
    displayName: credential.user.displayName
  });
  await setDoc(doc(db!, "Users", profile.id), { ...profile, role: "admin" });
  return { ...profile, role: "admin" };
}

export async function signOut() {
  if (isFirebaseConfigured && auth) {
    await firebaseSignOut(auth);
    return;
  }
  window.localStorage.removeItem(keys.session);
}

export async function changePassword(currentPassword: string, nextPassword: string) {
  if (!isFirebaseConfigured || !auth || !auth.currentUser || !auth.currentUser.email) {
    throw new Error("password-change-unavailable");
  }

  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await firebaseUpdatePassword(auth.currentUser, nextPassword);
}

export function listenAuth(callback: (user: AppUser | null) => void) {
  if (isFirebaseConfigured && auth) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }

      try {
        const profile = await withTimeout(
          ensureFirebaseUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName
          }),
          4500,
          () =>
            fallbackFirebaseProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName
            })
        );
        callback(profile);
      } catch {
        callback(null);
      }
    });
  }

  const users = readSeed(keys.users, seedUsers);
  const session = window.localStorage.getItem(keys.session);
  callback(users.find((user) => user.id === session) ?? null);
  return () => undefined;
}

export async function saveUser(user: AppUser) {
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "Users", user.id), user);
    if (user.calendarSyncToken) {
      await syncCalendarFeedForUser(user, await listSchedules());
    }
    return user;
  }

  const snapshot = readDemoStore();
  const next = snapshot.users.some((item) => item.id === user.id)
    ? snapshot.users.map((item) => (item.id === user.id ? user : item))
    : [user, ...snapshot.users];
  writeSeed(keys.users, next);
  return user;
}

export function getCalendarSyncUrl(token: string, origin?: string) {
  return buildCalendarSyncUrl(token, origin);
}

export async function ensureCalendarSync(user: AppUser, origin?: string) {
  const nextUser = user.calendarSyncToken ? user : { ...user, calendarSyncToken: buildCalendarSyncToken() };
  await saveUser(nextUser);
  return {
    user: nextUser,
    url: buildCalendarSyncUrl(nextUser.calendarSyncToken!, origin)
  };
}

export async function regenerateCalendarSync(user: AppUser, origin?: string) {
  if (isFirebaseConfigured && db && user.calendarSyncToken) {
    await deleteCalendarFeed(user.calendarSyncToken);
  }

  const nextUser = { ...user, calendarSyncToken: buildCalendarSyncToken() };
  await saveUser(nextUser);
  return {
    user: nextUser,
    url: buildCalendarSyncUrl(nextUser.calendarSyncToken!, origin)
  };
}

export async function deleteUser(userId: string) {
  if (isFirebaseConfigured && db) {
    await deleteDoc(doc(db, "Users", userId));
    return;
  }

  const snapshot = readDemoStore();
  writeSeed(keys.users, snapshot.users.filter((item) => item.id !== userId));
}

export async function listSchedules() {
  return isFirebaseConfigured ? readCollection<ScheduleItem>("Schedules") : readDemoStore().schedules;
}

export async function saveSchedule(schedule: ScheduleDraft) {
  const existing = schedule.id ? (await listSchedules()).find((item) => item.id === schedule.id) : null;
  const payload = removeUndefinedDeep<ScheduleItem>({
    ...schedule,
    visibility: schedule.visibility ?? "public",
    id: schedule.id ?? uid(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "Schedules", payload.id), payload);
    await syncCalendarFeedsForUsers(
      Array.from(new Set([payload.ownerUserId, ...payload.participantUserIds, ...(existing ? [existing.ownerUserId, ...existing.participantUserIds] : [])]))
    );
    return payload;
  }

  const snapshot = readDemoStore();
  const next = snapshot.schedules.some((item) => item.id === payload.id)
    ? snapshot.schedules.map((item) => (item.id === payload.id ? payload : item))
    : [payload, ...snapshot.schedules];
  writeSeed(keys.schedules, next);
  return payload;
}

export async function deleteSchedule(scheduleId: string) {
  if (isFirebaseConfigured && db) {
    const existing = (await listSchedules()).find((item) => item.id === scheduleId);
    await deleteDoc(doc(db, "Schedules", scheduleId));
    if (existing) {
      await syncCalendarFeedsForUsers(Array.from(new Set([existing.ownerUserId, ...existing.participantUserIds])));
    }
    return;
  }

  const snapshot = readDemoStore();
  writeSeed(keys.schedules, snapshot.schedules.filter((item) => item.id !== scheduleId));
}

export async function listFacilities() {
  return isFirebaseConfigured ? readCollection<Facility>("Facilities") : readDemoStore().facilities;
}

export async function seedDefaultFacilities() {
  if (isFirebaseConfigured && db) {
    const firestore = db;
    await Promise.all(seedFacilities.map((facility) => setDoc(doc(firestore, "Facilities", facility.id), facility)));
    return listFacilities();
  }

  writeSeed(keys.facilities, seedFacilities);
  return seedFacilities;
}

export async function listReservations() {
  return isFirebaseConfigured ? readCollection<Reservation>("Reservations") : readDemoStore().reservations;
}

export async function saveReservation(reservation: Omit<Reservation, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const payload: Reservation = {
    ...reservation,
    id: reservation.id ?? uid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "Reservations", payload.id), payload);
    return payload;
  }

  const snapshot = readDemoStore();
  const next = snapshot.reservations.some((item) => item.id === payload.id)
    ? snapshot.reservations.map((item) => (item.id === payload.id ? payload : item))
    : [payload, ...snapshot.reservations];
  writeSeed(keys.reservations, next);
  return payload;
}

export async function listPosts() {
  return isFirebaseConfigured ? readCollection<BoardPost>("Posts") : readDemoStore().posts;
}

export async function listComments() {
  return isFirebaseConfigured ? readCollection<BoardComment>("Comments") : readDemoStore().comments;
}

export async function savePost(post: Omit<BoardPost, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const payload: BoardPost = {
    ...post,
    id: post.id ?? uid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "Posts", payload.id), payload);
    return payload;
  }

  const snapshot = readDemoStore();
  const next = snapshot.posts.some((item) => item.id === payload.id)
    ? snapshot.posts.map((item) => (item.id === payload.id ? payload : item))
    : [payload, ...snapshot.posts];
  writeSeed(keys.posts, next);
  return payload;
}

export async function saveComment(comment: Omit<BoardComment, "id" | "createdAt">) {
  const payload: BoardComment = { ...comment, id: uid(), createdAt: new Date().toISOString() };

  if (isFirebaseConfigured && db) {
    await addDoc(collection(db, "Comments"), payload);
    return payload;
  }

  const snapshot = readDemoStore();
  writeSeed(keys.comments, [payload, ...snapshot.comments]);
  return payload;
}
