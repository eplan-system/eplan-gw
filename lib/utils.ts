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
      date: `${date.getMonth() + 1}/${date.getDate()}`
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
      isCurrentMonth: date.getMonth() === monthStart.getMonth()
    };
  });
}

export function schedulesForUserOnDay(schedules: ScheduleItem[], userId: string, isoDay: string) {
  return schedules.filter((schedule) => {
    const day = schedule.startAt.slice(0, 10);
    return day === isoDay && (schedule.ownerUserId === userId || schedule.participantUserIds.includes(userId));
  });
}

export function schedulesForUserInMonth(schedules: ScheduleItem[], userId: string, base = new Date()) {
  const monthStart = startOfMonth(base);
  const targetYear = monthStart.getFullYear();
  const targetMonth = monthStart.getMonth();

  return schedules.filter((schedule) => {
    const date = new Date(schedule.startAt);
    const involved = schedule.ownerUserId === userId || schedule.participantUserIds.includes(userId);
    return involved && date.getFullYear() === targetYear && date.getMonth() === targetMonth;
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

  if (rule.frequency === "daily") {
    return `${rule.interval}日ごと`;
  }

  if (rule.frequency === "weekly") {
    const labels = (rule.weeklyDays ?? []).map((day) => WEEKDAY_LABELS[day]).join("・");
    return `${rule.interval}週ごと / ${labels || "曜日未指定"}`;
  }

  if (rule.frequency === "monthly") {
    return `${rule.interval}か月ごと`;
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
      lines.push(`DTSTART:${formatIcsDate(schedule.startAt)}`);
      lines.push(`DTEND:${formatIcsDate(schedule.endAt)}`);
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
  const until = new Date(`${recurrenceRule.until}T23:59:59`);
  const durationMs = end.getTime() - start.getTime();
  const seriesId = schedule.seriesId ?? uid();
  const occurrences: ScheduleDraft[] = [];

  if (recurrenceRule.frequency === "daily") {
    for (let cursor = new Date(start); cursor <= until; cursor = addDays(cursor, recurrenceRule.interval)) {
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

    for (let cursor = new Date(start); cursor <= until; cursor = addDays(cursor, recurrenceRule.interval * 7)) {
      weeklyDays.forEach((weekday) => {
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
    for (let cursor = new Date(start); cursor <= until; ) {
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
