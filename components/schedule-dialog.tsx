"use client";

import { FormEvent, useEffect, useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/constants";
import { AppUser, Facility, RecurrenceFrequency, RecurrenceRule, ScheduleDraft, ScheduleItem, ScheduleVisibility } from "@/lib/types";
import { formatDateKey, recurrenceSummary } from "@/lib/utils";

type Props = {
  open: boolean;
  users: AppUser[];
  facilities: Facility[];
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
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoFromLocalDateTime(value: string) {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    throw new Error("invalid-datetime");
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
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

export function ScheduleDialog({
  open,
  users,
  facilities,
  initialUserId,
  initialDate,
  initialFacilityIds = [],
  schedule,
  onClose,
  onSave,
  onDelete
}: Props) {
  const defaults = defaultRange(initialDate);
  const [form, setForm] = useState<ScheduleDraft>({
    title: "",
    startAt: defaults.startAt,
    endAt: defaults.endAt,
    ownerUserId: initialUserId,
    participantUserIds: initialUserId ? [initialUserId] : [],
    facilityIds: initialFacilityIds,
    memo: "",
    visibility: "public"
  });
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUntil, setRecurrenceUntil] = useState(defaultUntil(initialDate));
  const [weeklyDays, setWeeklyDays] = useState<number[]>([new Date(`${initialDate}T09:00:00`).getDay()]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    if (schedule) {
      setErrorMessage("");
      setForm({
        id: schedule.id,
        title: schedule.title,
        startAt: toLocalDateTime(schedule.startAt),
        endAt: toLocalDateTime(schedule.endAt),
        ownerUserId: schedule.ownerUserId,
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
      setWeeklyDays(schedule.recurrenceRule?.weeklyDays ?? [new Date(schedule.startAt).getDay()]);
      setShowAdvanced(Boolean(schedule.recurrenceRule || schedule.visibility !== "public"));
      return;
    }

    setForm({
      title: "",
      startAt: defaults.startAt,
      endAt: defaults.endAt,
      ownerUserId: initialUserId,
      participantUserIds: initialUserId ? [initialUserId] : [],
      facilityIds: initialFacilityIds,
      memo: "",
      visibility: "public"
    });
    setRecurrenceFrequency("none");
    setRecurrenceInterval(1);
    setRecurrenceUntil(defaultUntil(initialDate));
    setWeeklyDays([new Date(`${initialDate}T09:00:00`).getDay()]);
    setShowAdvanced(false);
    setErrorMessage("");
  }, [defaults.endAt, defaults.startAt, initialDate, initialFacilityIds, initialUserId, open, schedule]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSaving(true);

    try {
      const nextOwnerId = form.ownerUserId || initialUserId || users[0]?.id || "";
      const participantIds = form.participantUserIds.length ? form.participantUserIds : nextOwnerId ? [nextOwnerId] : [];
      const startIso = toIsoFromLocalDateTime(form.startAt);
      const endIso = toIsoFromLocalDateTime(form.endAt);

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
              until: recurrenceUntil,
              weeklyDays: recurrenceFrequency === "weekly" ? weeklyDays : undefined
            }
          : null;

      await onSave({
        id: schedule?.id,
        title: form.title.trim(),
        startAt: startIso,
        endAt: endIso,
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

  const visibilityOptions: { value: ScheduleVisibility; label: string }[] = [
    { value: "public", label: "通常表示" },
    { value: "busy", label: "予定ありのみ" },
    { value: "private", label: "自分のみ表示" }
  ];

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-card dialog-card-simple" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <p className="eyebrow">{schedule ? "edit schedule" : "new schedule"}</p>
            <h3>{schedule ? "予定の変更" : "予定の登録"}</h3>
          </div>
          <button className="small-button" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>

        <form className="form-grid detail-main" onSubmit={handleSubmit}>
          <label className="field full">
            <span>件名</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="予定名を入力" required />
          </label>

          <label className="field">
            <span>開始日時</span>
            <input type="datetime-local" value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} required />
          </label>

          <label className="field">
            <span>終了日時</span>
            <input type="datetime-local" value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} required />
          </label>

          <label className="field">
            <span>登録者</span>
            <select
              value={form.ownerUserId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ownerUserId: event.target.value,
                  participantUserIds: current.participantUserIds.length ? current.participantUserIds : [event.target.value]
                }))
              }
            >
              {users.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} / {member.department}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>参加者</span>
            <select
              multiple
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
                  {member.name} / {member.department}
                </option>
              ))}
            </select>
          </label>

          <label className="field full">
            <span>設備・会議室</span>
            <select
              multiple
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
                          until: recurrenceUntil,
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
                      <span>終了日</span>
                      <input type="date" value={recurrenceUntil} onChange={(event) => setRecurrenceUntil(event.target.value)} />
                    </label>
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
