import { WEEKDAY_LABELS } from "@/lib/constants";
import { AppUser, RecurrenceRule, ScheduleDraft, ScheduleItem } from "@/lib/types";

export function formatDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function localDateKeyFromIso(value: string) {
  return formatDateKey(new Date(value));
}

export function formatScheduleTimeLabel(schedule: ScheduleItem) {
  if (schedule.allDay) {
    return "終日";
  }

  return `${new Date(schedule.startAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit"
  })} - ${new Date(schedule.endAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

export function startOfWeek(base = new Date()) {
  const date = new Date(base);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function buildWeekDays(base = new Date()) {
  const start = startOfWeek(base);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: formatDateKey(date),
      label: WEEKDAY_LABELS[(index + 1) % 7],
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      dayOfWeek: date.getDay()
    };
  });
}

export function isTodayKey(dayKey: string) {
  return dayKey === formatDateKey(new Date());
}

export function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfMonth(base = new Date()) {
  const next = new Date(base);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function buildMonthDays(base = new Date()) {
  const monthStart = startOfMonth(base);
  const gridStart = startOfWeek(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      key: formatDateKey(date),
      label: WEEKDAY_LABELS[date.getDay()],
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      dayOfWeek: date.getDay()
    };
  });
}

export function scheduleIntersectsDay(schedule: ScheduleItem, dayKey: string) {
  const startKey = localDateKeyFromIso(schedule.startAt);
  const endDate = new Date(schedule.endAt);

  if (
    !schedule.allDay &&
    endDate.getHours() === 0 &&
    endDate.getMinutes() === 0 &&
    endDate.getSeconds() === 0 &&
    endDate.getMilliseconds() === 0
  ) {
    endDate.setDate(endDate.getDate() - 1);
  }

  const endKey = formatDateKey(endDate);
  return startKey <= dayKey && endKey >= dayKey;
}

function nthMonday(year: number, month: number, nth: number) {
  const date = new Date(year, month - 1, 1);
  const firstDay = date.getDay();
  const offset = (8 - firstDay) % 7;
  return 1 + offset + (nth - 1) * 7;
}

function vernalEquinoxDay(year: number) {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnEquinoxDay(year: number) {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function holidayKey(year: number, month: number, day: number) {
  return formatDateKey(new Date(year, month - 1, day));
}

function buildJapaneseHolidayMap(year: number) {
  const holidays = new Map<string, string>();
  const add = (month: number, day: number, name: string) => holidays.set(holidayKey(year, month, day), name);

  add(1, 1, "元日");
  add(2, 11, "建国記念の日");
  if (year >= 2020) {
    add(2, 23, "天皇誕生日");
  }
  add(4, 29, "昭和の日");
  add(5, 3, "憲法記念日");
  add(5, 4, "みどりの日");
  add(5, 5, "こどもの日");
  add(8, 11, "山の日");
  add(11, 3, "文化の日");
  add(11, 23, "勤労感謝の日");

  add(1, nthMonday(year, 1, 2), "成人の日");
  add(7, nthMonday(year, 7, 3), "海の日");
  add(9, nthMonday(year, 9, 3), "敬老の日");
  add(10, nthMonday(year, 10, 2), "スポーツの日");

  add(3, vernalEquinoxDay(year), "春分の日");
  add(9, autumnEquinoxDay(year), "秋分の日");

  const baseEntries = [...holidays.entries()];

  for (const [key, name] of baseEntries) {
    const date = new Date(`${key}T00:00:00`);
    if (date.getDay() !== 0) continue;

    const substitute = new Date(date);
    do {
      substitute.setDate(substitute.getDate() + 1);
    } while (holidays.has(formatDateKey(substitute)));

    holidays.set(formatDateKey(substitute), "振替休日");
  }

  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 2; day < daysInMonth; day += 1) {
      const current = new Date(year, month - 1, day);
      const currentKey = formatDateKey(current);
      const prevKey = formatDateKey(new Date(year, month - 1, day - 1));
      const nextKey = formatDateKey(new Date(year, month - 1, day + 1));

      if (current.getDay() !== 0 && !holidays.has(currentKey) && holidays.has(prevKey) && holidays.has(nextKey)) {
        holidays.set(currentKey, "国民の休日");
      }
    }
  }

  return holidays;
}

const holidayCache = new Map<number, Map<string, string>>();

function getHolidayMap(year: number) {
  if (!holidayCache.has(year)) {
    holidayCache.set(year, buildJapaneseHolidayMap(year));
  }
  return holidayCache.get(year)!;
}

export function getJapaneseHolidayName(dayKey: string) {
  const [year] = dayKey.split("-").map(Number);
  return getHolidayMap(year).get(dayKey) ?? null;
}

export function isHolidayKey(dayKey: string) {
  return Boolean(getJapaneseHolidayName(dayKey));
}

export function isSaturdayKey(dayKey: string) {
  return new Date(`${dayKey}T00:00:00`).getDay() === 6;
}

export function isSundayKey(dayKey: string) {
  return new Date(`${dayKey}T00:00:00`).getDay() === 0;
}

export function schedulesForUserOnDay(schedules: ScheduleItem[], userId: string, isoDay: string) {
  return schedules.filter((schedule) => {
    const involved = schedule.ownerUserId === userId || schedule.participantUserIds.includes(userId);
    return involved && scheduleIntersectsDay(schedule, isoDay);
  });
}

export function schedulesForUserInMonth(schedules: ScheduleItem[], userId: string, base = new Date()) {
  const monthStart = startOfMonth(base);
  const targetYear = monthStart.getFullYear();
  const targetMonth = monthStart.getMonth();
  const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  return schedules.filter((schedule) => {
    const involved = schedule.ownerUserId === userId || schedule.participantUserIds.includes(userId);
    const scheduleStart = new Date(schedule.startAt);
    const scheduleEnd = new Date(schedule.endAt);
    return involved && scheduleStart <= monthEnd && scheduleEnd >= monthStart;
  });
}

export function sortUsersForDisplay(users: AppUser[], currentUserId?: string | null) {
  return [...users].sort((left, right) => {
    if (currentUserId) {
      if (left.id === currentUserId && right.id !== currentUserId) return -1;
      if (right.id === currentUserId && left.id !== currentUserId) return 1;
    }

    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name, "ja");
  });
}

export function userNameById(users: AppUser[], userId: string) {
  return users.find((user) => user.id === userId)?.name ?? "他メンバー";
}

export function recurrenceSummary(rule?: RecurrenceRule | null) {
  if (!rule) return "単発予定";

  const endLabel =
    rule.endMode === "count"
      ? `${rule.count ?? 1}回`
      : rule.endMode === "never"
        ? "終了なし"
        : rule.until
          ? `${rule.until}まで`
          : "終了日未設定";

  if (rule.frequency === "daily") {
    return `${rule.interval}日ごと / ${endLabel}`;
  }

  if (rule.frequency === "weekly") {
    const labels = (rule.weeklyDays ?? []).map((day) => WEEKDAY_LABELS[day]).join("・");
    return `${rule.interval}週ごと / ${labels || "曜日未指定"} / ${endLabel}`;
  }

  if (rule.frequency === "monthly") {
    return `${rule.interval}か月ごと / ${endLabel}`;
  }

  return "単発予定";
}

export function canViewSchedule(schedule: ScheduleItem, viewerUserId?: string | null) {
  if (schedule.visibility !== "private") return true;
  return schedule.ownerUserId === viewerUserId;
}

export function presentSchedule(schedule: ScheduleItem, viewerUserId?: string | null) {
  const isOwner = schedule.ownerUserId === viewerUserId;

  if (schedule.visibility === "private" && !isOwner) {
    return null;
  }

  if (schedule.visibility === "busy" && !isOwner) {
    return {
      title: "予定あり",
      memo: "",
      visibilityLabel: "予定あり表示"
    };
  }

  if (schedule.visibility === "private" && isOwner) {
    return {
      title: schedule.title,
      memo: schedule.memo,
      visibilityLabel: "完全非表示"
    };
  }

  return {
    title: schedule.title,
    memo: schedule.memo,
    visibilityLabel: schedule.visibility === "public" ? "通常表示" : "予定あり表示"
  };
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function formatIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatIcsAllDayDate(value: string) {
  return new Date(value).toISOString().slice(0, 10).replace(/-/g, "");
}

export function buildIcsFile(schedules: ScheduleItem[], calendarName: string) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Office Hub//Groupware//JA",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`
  ];

  schedules
    .slice()
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .forEach((schedule) => {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${schedule.id}@office-hub.local`);
      lines.push(`DTSTAMP:${formatIcsDate(schedule.updatedAt || schedule.createdAt)}`);
      if (schedule.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${formatIcsAllDayDate(schedule.startAt)}`);
        lines.push(`DTEND;VALUE=DATE:${formatIcsAllDayDate(schedule.endAt)}`);
      } else {
        lines.push(`DTSTART:${formatIcsDate(schedule.startAt)}`);
        lines.push(`DTEND:${formatIcsDate(schedule.endAt)}`);
      }
      lines.push(`SUMMARY:${escapeIcsText(schedule.title)}`);
      if (schedule.memo) {
        lines.push(`DESCRIPTION:${escapeIcsText(schedule.memo)}`);
      }
      lines.push(`CLASS:${schedule.visibility === "private" ? "PRIVATE" : "PUBLIC"}`);
      lines.push("END:VEVENT");
    });

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function expandRecurringSchedules(schedule: ScheduleDraft) {
  const recurrenceRule = schedule.recurrenceRule;
  if (!recurrenceRule) {
    return [schedule];
  }

  const start = new Date(schedule.startAt);
  const end = new Date(schedule.endAt);
  const durationMs = end.getTime() - start.getTime();
  const seriesId = schedule.seriesId ?? uid();
  const occurrences: ScheduleDraft[] = [];
  const endMode = recurrenceRule.endMode ?? "until";
  const maxOccurrences =
    endMode === "count"
      ? Math.max(1, recurrenceRule.count ?? 1)
      : recurrenceRule.frequency === "daily"
        ? 180
        : recurrenceRule.frequency === "weekly"
          ? 104
          : 24;
  const until =
    endMode === "until" && recurrenceRule.until
      ? new Date(`${recurrenceRule.until}T23:59:59`)
      : endMode === "never"
        ? new Date(start.getTime() + 1000 * 60 * 60 * 24 * 366 * 2)
        : new Date(start.getTime() + 1000 * 60 * 60 * 24 * 366 * 2);

  if (recurrenceRule.frequency === "daily") {
    for (let cursor = new Date(start), count = 0; cursor <= until && count < maxOccurrences; cursor = addDays(cursor, recurrenceRule.interval), count += 1) {
      const nextStart = new Date(cursor);
      const nextEnd = new Date(nextStart.getTime() + durationMs);
      occurrences.push({
        ...schedule,
        startAt: nextStart.toISOString(),
        endAt: nextEnd.toISOString(),
        seriesId,
        recurrenceRule
      });
    }
    return occurrences;
  }

  if (recurrenceRule.frequency === "weekly") {
    const weeklyDays = recurrenceRule.weeklyDays?.length ? recurrenceRule.weeklyDays : [start.getDay()];

    for (let cursor = new Date(start); cursor <= until && occurrences.length < maxOccurrences; cursor = addDays(cursor, recurrenceRule.interval * 7)) {
      weeklyDays.forEach((weekday) => {
        if (occurrences.length >= maxOccurrences) return;
        const nextStart = new Date(cursor);
        nextStart.setDate(nextStart.getDate() + (weekday - nextStart.getDay()));
        nextStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
        if (nextStart < start || nextStart > until) return;

        const nextEnd = new Date(nextStart.getTime() + durationMs);
        occurrences.push({
          ...schedule,
          startAt: nextStart.toISOString(),
          endAt: nextEnd.toISOString(),
          seriesId,
          recurrenceRule
        });
      });
    }

    return occurrences.sort((left, right) => left.startAt.localeCompare(right.startAt));
  }

  if (recurrenceRule.frequency === "monthly") {
    for (let cursor = new Date(start), count = 0; cursor <= until && count < maxOccurrences; count += 1) {
      const nextStart = new Date(cursor);
      const nextEnd = new Date(nextStart.getTime() + durationMs);
      occurrences.push({
        ...schedule,
        startAt: nextStart.toISOString(),
        endAt: nextEnd.toISOString(),
        seriesId,
        recurrenceRule
      });

      cursor = new Date(nextStart);
      cursor.setMonth(cursor.getMonth() + recurrenceRule.interval);
    }

    return occurrences;
  }

  return [schedule];
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
