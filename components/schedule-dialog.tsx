"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/constants";
import {
  AppUser,
  Facility,
  RecurrenceFrequency,
  RecurrenceRule,
  ScheduleDraft,
  ScheduleItem,
  ScheduleVisibility
} from "@/lib/types";
import { formatDateKey, localDateKeyFromIso, recurrenceSummary } from "@/lib/utils";

const TOKYO_TIME_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

type Props = {
  open: boolean;
  users: AppUser[];
  facilities: Facility[];
  currentUserId: string;
  initialUserId: string;
  initialDate: string;
  initialFacilityIds?: string[];
  schedule: ScheduleItem | null;
  onClose: () => void;
  onSave: (payload: ScheduleDraft) => Promise<void>;
  onDelete: (scheduleId: string) => Promise<void>;
};

function toLocalDateTime(value: string) {
  const date = new Date(value);
  return `${localDateKeyFromIso(value)}T${TOKYO_TIME_FORMATTER.format(date)}`;
}

function toIsoFromLocalDateTime(value: string) {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    throw new Error("invalid-datetime");
  }

  return `${datePart}T${timePart}:00+09:00`;
}

function toIsoFromAllDayDate(datePart: string, endOfDay = false) {
  if (!datePart) {
    throw new Error("invalid-date");
  }

  if (!endOfDay) {
    return `${datePart}T00:00:00+09:00`;
  }

  const nextDate = new Date(`${datePart}T00:00:00+09:00`);
  nextDate.setDate(nextDate.getDate() + 1);
  return `${formatDateKey(nextDate)}T00:00:00+09:00`;
}

function defaultRange(dateKey: string) {
  return {
    startAt: `${dateKey}T09:00`,
    endAt: `${dateKey}T10:00`
  };
}

function defaultUntil(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  return formatDateKey(date);
}

function splitLocalDateTime(value: string) {
  const [datePart, timePart = "09:00"] = value.split("T");
  return {
    datePart,
    timePart: timePart.slice(0, 5)
  };
}

function addHoursToLocalDateTime(datePart: string, timePart: string, hours: number) {
  const date = new Date(`${datePart}T${timePart}:00+09:00`);
  date.setHours(date.getHours() + hours);
  return {
    datePart: formatDateKey(date),
    timePart: TOKYO_TIME_FORMATTER.format(date)
  };
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hour = String(Math.floor(index / 4)).padStart(2, "0");
  const minute = String((index % 4) * 15).padStart(2, "0");
  return `${hour}:${minute}`;
});

export function ScheduleDialog({
  open,
  users,
  facilities,
  currentUserId,
  initialUserId,
  initialDate,
  initialFacilityIds = [],
  schedule,
  onClose,
  onSave,
  onDelete
}: Props) {
  const defaults = useMemo(() => defaultRange(initialDate), [initialDate]);
  const defaultOwnerUserId = useMemo(() => currentUserId || initialUserId || users[0]?.id || "", [currentUserId, initialUserId, users]);
  const defaultParticipantUserIds = useMemo(
    () => (initialUserId ? [initialUserId] : defaultOwnerUserId ? [defaultOwnerUserId] : []),
    [defaultOwnerUserId, initialUserId]
  );
  const initialFacilityKey = initialFacilityIds.join("|");
  const normalizedInitialFacilityIds = useMemo(() => [...initialFacilityIds], [initialFacilityKey]);

  const [form, setForm] = useState<ScheduleDraft>({
    title: "",
    startAt: defaults.startAt,
    endAt: defaults.endAt,
    ownerUserId: defaultOwnerUserId,
    participantUserIds: defaultParticipantUserIds,
    facilityIds: initialFacilityIds,
    memo: "",
    visibility: "public"
  });
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUntil, setRecurrenceUntil] = useState(defaultUntil(initialDate));
  const [recurrenceEndMode, setRecurrenceEndMode] = useState<"until" | "count" | "never">("until");
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [weeklyDays, setWeeklyDays] = useState<number[]>([new Date(`${initialDate}T09:00:00`).getDay()]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [autoAdjustEnd, setAutoAdjustEnd] = useState(true);
  const [startDate, setStartDate] = useState(defaults.startAt.slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(defaults.endAt.slice(0, 10));
  const [endTime, setEndTime] = useState("10:00");

  useEffect(() => {
    if (!open) return;

    if (schedule) {
      const startParts = splitLocalDateTime(toLocalDateTime(schedule.startAt));
      const normalizedEndAt =
        schedule.allDay
          ? `${formatDateKey(new Date(new Date(schedule.endAt).getTime() - 1))}T00:00`
          : toLocalDateTime(schedule.endAt);
      const endParts = splitLocalDateTime(normalizedEndAt);
      setErrorMessage("");
      setForm({
        id: schedule.id,
        title: schedule.title,
        startAt: `${startParts.datePart}T${startParts.timePart}`,
        endAt: `${endParts.datePart}T${endParts.timePart}`,
        allDay: schedule.allDay ?? false,
        ownerUserId: currentUserId || schedule.ownerUserId,
        participantUserIds: schedule.participantUserIds,
        facilityIds: schedule.facilityIds ?? [],
        memo: schedule.memo,
        visibility: schedule.visibility ?? "public",
        seriesId: schedule.seriesId,
        recurrenceRule: schedule.recurrenceRule ?? null
      });
      setRecurrenceFrequency(schedule.recurrenceRule?.frequency ?? "none");
      setRecurrenceInterval(schedule.recurrenceRule?.interval ?? 1);
      setRecurrenceUntil(schedule.recurrenceRule?.until ?? schedule.startAt.slice(0, 10));
      setRecurrenceEndMode(
        schedule.recurrenceRule?.endMode ?? (schedule.recurrenceRule?.count ? "count" : schedule.recurrenceRule?.until ? "until" : "never")
      );
      setRecurrenceCount(schedule.recurrenceRule?.count ?? 10);
      setWeeklyDays(schedule.recurrenceRule?.weeklyDays ?? [new Date(schedule.startAt).getDay()]);
      setShowAdvanced(Boolean(schedule.recurrenceRule || schedule.visibility !== "public"));
      setAllDay(schedule.allDay ?? false);
      setAutoAdjustEnd(false);
      setStartDate(startParts.datePart);
      setStartTime(startParts.timePart);
      setEndDate(endParts.datePart);
      setEndTime(endParts.timePart);
      return;
    }

    const nextStart = splitLocalDateTime(defaults.startAt);
    const nextEnd = splitLocalDateTime(defaults.endAt);
      setForm({
        title: "",
        startAt: `${nextStart.datePart}T${nextStart.timePart}`,
        endAt: `${nextEnd.datePart}T${nextEnd.timePart}`,
        allDay: false,
        ownerUserId: defaultOwnerUserId,
        participantUserIds: defaultParticipantUserIds,
        facilityIds: normalizedInitialFacilityIds,
        memo: "",
        visibility: "public"
      });
    setRecurrenceFrequency("none");
    setRecurrenceInterval(1);
    setRecurrenceUntil(defaultUntil(initialDate));
    setRecurrenceEndMode("until");
    setRecurrenceCount(10);
    setWeeklyDays([new Date(`${initialDate}T09:00:00`).getDay()]);
    setShowAdvanced(false);
    setErrorMessage("");
    setAllDay(false);
    setAutoAdjustEnd(true);
    setStartDate(nextStart.datePart);
    setStartTime(nextStart.timePart);
    setEndDate(nextEnd.datePart);
    setEndTime(nextEnd.timePart);
  }, [
    currentUserId,
    defaultOwnerUserId,
    defaultParticipantUserIds,
    defaults.endAt,
    defaults.startAt,
    initialDate,
    normalizedInitialFacilityIds,
    open,
    schedule
  ]);

  if (!open) return null;

  const visibilityOptions: { value: ScheduleVisibility; label: string }[] = [
    { value: "public", label: "通常表示" },
    { value: "busy", label: "予定ありのみ" },
    { value: "private", label: "自分のみ表示" }
  ];

  function syncEndWithStart(nextStartDate: string, nextStartTime: string) {
    const nextEnd = addHoursToLocalDateTime(nextStartDate, nextStartTime, 1);
    setEndDate(nextEnd.datePart);
    setEndTime(nextEnd.timePart);
    setForm((current) => ({
      ...current,
      startAt: `${nextStartDate}T${nextStartTime}`,
      endAt: `${nextEnd.datePart}T${nextEnd.timePart}`
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSaving(true);

    try {
      const nextOwnerId = currentUserId || form.ownerUserId || initialUserId || users[0]?.id || "";
      const fallbackParticipantId = initialUserId || nextOwnerId;
      const participantIds = form.participantUserIds.length ? form.participantUserIds : fallbackParticipantId ? [fallbackParticipantId] : [];
      const startLocal = `${startDate}T${startTime}`;
      const endLocal = `${endDate}T${endTime}`;
      const startIso = allDay ? toIsoFromAllDayDate(startDate) : toIsoFromLocalDateTime(startLocal);
      const endIso = allDay ? toIsoFromAllDayDate(endDate, true) : toIsoFromLocalDateTime(endLocal);

      if (new Date(startIso) >= new Date(endIso)) {
        setErrorMessage("終了日時は開始日時より後にしてください。");
        setSaving(false);
        return;
      }

      const recurrenceRule: RecurrenceRule | null =
        recurrenceFrequency !== "none"
          ? {
              frequency: recurrenceFrequency as Exclude<RecurrenceFrequency, "none">,
              interval: recurrenceInterval,
              endMode: recurrenceEndMode,
              until: recurrenceEndMode === "until" ? recurrenceUntil : undefined,
              count: recurrenceEndMode === "count" ? recurrenceCount : undefined,
              weeklyDays: recurrenceFrequency === "weekly" ? weeklyDays : undefined
            }
          : null;

      await onSave({
        id: schedule?.id,
        title: form.title.trim(),
        startAt: startIso,
        endAt: endIso,
        allDay,
        ownerUserId: nextOwnerId,
        participantUserIds: participantIds,
        facilityIds: form.facilityIds,
        memo: form.memo.trim(),
        visibility: form.visibility,
        seriesId: form.seriesId,
        recurrenceRule
      });
    } catch {
      setErrorMessage("予定の保存に失敗しました。入力内容か Firebase 設定を確認してください。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-card dialog-card-simple" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <p className="eyebrow">{schedule ? "edit schedule" : "new schedule"}</p>
            <h3>{schedule ? "予定の編集" : "予定の登録"}</h3>
          </div>
          <button className="small-button" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>

        <form className="form-grid detail-main" onSubmit={handleSubmit}>
          <label className="field full">
            <span>タイトル</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="予定名を入力"
              required
            />
          </label>

          <div className="full schedule-date-grid">
            <label className="field">
              <span>開始日</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  const nextStartDate = event.target.value;
                  setStartDate(nextStartDate);
                  if (!schedule && autoAdjustEnd && !allDay) {
                    syncEndWithStart(nextStartDate, startTime);
                    return;
                  }
                  setForm((current) => ({ ...current, startAt: `${nextStartDate}T${startTime}` }));
                }}
                required
              />
            </label>

            <label className="field">
              <span>終了日</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  const nextEndDate = event.target.value;
                  setAutoAdjustEnd(false);
                  setEndDate(nextEndDate);
                  setForm((current) => ({ ...current, endAt: `${nextEndDate}T${endTime}` }));
                }}
                required
              />
            </label>
          </div>

          <div className={`full schedule-time-grid${allDay ? " is-disabled" : ""}`}>
            <label className="field">
              <span>開始時刻</span>
              <select
                value={startTime}
                disabled={allDay}
                onChange={(event) => {
                  const nextStartTime = event.target.value;
                  setStartTime(nextStartTime);
                  if (!schedule && autoAdjustEnd && !allDay) {
                    syncEndWithStart(startDate, nextStartTime);
                    return;
                  }
                  setForm((current) => ({ ...current, startAt: `${startDate}T${nextStartTime}` }));
                }}
              >
                {TIME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>終了時刻</span>
              <select
                value={endTime}
                disabled={allDay}
                onChange={(event) => {
                  const nextEndTime = event.target.value;
                  setAutoAdjustEnd(false);
                  setEndTime(nextEndTime);
                  setForm((current) => ({ ...current, endAt: `${endDate}T${nextEndTime}` }));
                }}
              >
                {TIME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-checkbox schedule-all-day-field">
              <span>終日</span>
              <label className="checkbox-row schedule-all-day-toggle">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(event) => {
                    const nextAllDay = event.target.checked;
                    setAllDay(nextAllDay);
                    if (nextAllDay && endDate < startDate) {
                      setEndDate(startDate);
                    } else if (!nextAllDay && !schedule) {
                      const nextEnd = addHoursToLocalDateTime(startDate, startTime, 1);
                      setEndDate(nextEnd.datePart);
                      setEndTime(nextEnd.timePart);
                      setAutoAdjustEnd(true);
                    }
                    setForm((current) => ({
                      ...current,
                      allDay: nextAllDay
                    }));
                  }}
                />
                <span>終日</span>
              </label>
            </label>
          </div>

          <label className="field full">
            <span>参加者</span>
            <select
              multiple
              size={Math.min(Math.max(users.length, 4), 8)}
              value={form.participantUserIds}
              onChange={(event) =>
                setForm({
                  ...form,
                  participantUserIds: Array.from(event.target.selectedOptions).map((option) => option.value)
                })
              }
            >
              {users.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} / {member.department || "部署未設定"}
                </option>
              ))}
            </select>
          </label>

          <label className="field full">
            <span>設備・会議室</span>
            <select
              multiple
              size={Math.min(Math.max(facilities.length, 4), 8)}
              value={form.facilityIds}
              onChange={(event) =>
                setForm({
                  ...form,
                  facilityIds: Array.from(event.target.selectedOptions).map((option) => option.value)
                })
              }
            >
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field full">
            <span>メモ</span>
            <textarea rows={4} value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} />
          </label>

          <div className="full mobile-advanced-toggle-row">
            <button className="small-button mobile-advanced-toggle" type="button" onClick={() => setShowAdvanced((current) => !current)}>
              {showAdvanced ? "公開範囲・繰り返しを閉じる" : "公開範囲・繰り返しを開く"}
            </button>
          </div>

          <div className={showAdvanced ? "advanced-fields open" : "advanced-fields collapsed"}>
            <label className="field full">
              <span>公開範囲</span>
              <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ScheduleVisibility })}>
                {visibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="field full recurrence-box">
              <span>繰り返し</span>
              <div className="recurrence-stack">
                <div className="recurrence-options">
                  {[
                    { key: "none", label: "単発" },
                    { key: "daily", label: "毎日" },
                    { key: "weekly", label: "毎週" },
                    { key: "monthly", label: "毎月" }
                  ].map((item) => (
                    <button
                      key={item.key}
                      className={recurrenceFrequency === item.key ? "tab-button active" : "tab-button"}
                      type="button"
                      onClick={() => setRecurrenceFrequency(item.key as RecurrenceFrequency)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="hint-box">
                  <strong>
                    {recurrenceFrequency === "none"
                      ? "単発予定"
                      : recurrenceSummary({
                          frequency: recurrenceFrequency as Exclude<RecurrenceFrequency, "none">,
                          interval: recurrenceInterval,
                          endMode: recurrenceEndMode,
                          until: recurrenceEndMode === "until" ? recurrenceUntil : undefined,
                          count: recurrenceEndMode === "count" ? recurrenceCount : undefined,
                          weeklyDays
                        })}
                  </strong>
                </div>

                {recurrenceFrequency !== "none" ? (
                  <div className="form-grid compact-form-grid">
                    <label className="field">
                      <span>間隔</span>
                      <input type="number" min={1} value={recurrenceInterval} onChange={(event) => setRecurrenceInterval(Number(event.target.value || 1))} />
                    </label>
                    <label className="field">
                      <span>終了条件</span>
                      <select value={recurrenceEndMode} onChange={(event) => setRecurrenceEndMode(event.target.value as "until" | "count" | "never")}>
                        <option value="until">終了日を指定</option>
                        <option value="count">回数を指定</option>
                        <option value="never">終了なし</option>
                      </select>
                    </label>
                    {recurrenceEndMode === "until" ? (
                      <label className="field">
                        <span>終了日</span>
                        <input type="date" value={recurrenceUntil} onChange={(event) => setRecurrenceUntil(event.target.value)} />
                      </label>
                    ) : null}
                    {recurrenceEndMode === "count" ? (
                      <label className="field">
                        <span>回数</span>
                        <input type="number" min={1} value={recurrenceCount} onChange={(event) => setRecurrenceCount(Number(event.target.value || 1))} />
                      </label>
                    ) : null}
                    {recurrenceFrequency === "weekly" ? (
                      <div className="field full">
                        <span>曜日</span>
                        <div className="weekday-picker">
                          {WEEKDAY_LABELS.map((label, index) => (
                            <label key={label} className="weekday-chip">
                              <input
                                type="checkbox"
                                checked={weeklyDays.includes(index)}
                                onChange={(event) =>
                                  setWeeklyDays((current) =>
                                    event.target.checked ? [...current, index].sort((a, b) => a - b) : current.filter((day) => day !== index)
                                  )
                                }
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {errorMessage ? <p className="error-text full">{errorMessage}</p> : null}

          <div className="dialog-actions full">
            {schedule ? (
              <button
                className="small-button danger-button"
                type="button"
                onClick={async () => {
                  setErrorMessage("");
                  setSaving(true);
                  try {
                    await onDelete(schedule.id);
                  } catch {
                    setErrorMessage("予定の削除に失敗しました。");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                削除
              </button>
            ) : (
              <span />
            )}
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "保存中..." : schedule ? "変更を保存" : "登録する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
