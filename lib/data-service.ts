"use client";

import { addDoc, collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
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
    return user;
  }

  const snapshot = readDemoStore();
  const next = snapshot.users.some((item) => item.id === user.id)
    ? snapshot.users.map((item) => (item.id === user.id ? user : item))
    : [user, ...snapshot.users];
  writeSeed(keys.users, next);
  return user;
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
  const payload: ScheduleItem = {
    ...schedule,
    visibility: schedule.visibility ?? "public",
    id: schedule.id ?? uid(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "Schedules", payload.id), payload);
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
    await deleteDoc(doc(db, "Schedules", scheduleId));
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
