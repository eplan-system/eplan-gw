"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/constants";
import { AppUser, Facility, RecurrenceFrequency, RecurrenceRule, ScheduleDraft, ScheduleItem, ScheduleVisibility } from "@/lib/types";
import { formatDateKey, formatDateTime, recurrenceSummary, userNameById } from "@/lib/utils";

type Props = {
  open: boolean;
  users: AppUser[];
  facilities: Facility[];
  initialUserId: string;
  initialDate: string;
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
  schedule,
  onClose,
  onSave,
  onDelete
}: Props) {
  const defaults = useMemo(() => defaultRange(initialDate), [initialDate]);
  const [form, setForm] = useState<ScheduleDraft>({
    title: "",
    startAt: defaults.startAt,
    endAt: defaults.endAt,
    ownerUserId: initialUserId,
    participantUserIds: [initialUserId],
    facilityIds: [],
    memo: "",
    visibility: "public"
  });
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUntil, setRecurrenceUntil] = useState(defaultUntil(initialDate));
  const [weeklyDays, setWeeklyDays] = useState<number[]>([new Date(`${initialDate}T09:00:00`).getDay()]);

  useEffect(() => {
    if (!open) return;

    if (schedule) {
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
      return;
    }

    setForm({
      title: "",
      startAt: defaults.startAt,
      endAt: defaults.endAt,
      ownerUserId: initialUserId,
      participantUserIds: [initialUserId],
      facilityIds: [],
      memo: "",
      visibility: "public"
    });
    setRecurrenceFrequency("none");
    setRecurrenceInterval(1);
    setRecurrenceUntil(defaultUntil(initialDate));
    setWeeklyDays([new Date(`${initialDate}T09:00:00`).getDay()]);
  }, [defaults.endAt, defaults.startAt, initialDate, initialUserId, open, schedule]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const recurrenceRule: RecurrenceRule | null =
      !schedule && recurrenceFrequency !== "none"
        ? {
            frequency: recurrenceFrequency as Exclude<RecurrenceFrequency, "none">,
            interval: recurrenceInterval,
            until: recurrenceUntil,
            weeklyDays: recurrenceFrequency === "weekly" ? weeklyDays : undefined
          }
        : schedule?.recurrenceRule ?? null;

    await onSave({
      id: schedule?.id,
      title: form.title,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      ownerUserId: form.ownerUserId,
      participantUserIds: form.participantUserIds,
      facilityIds: form.facilityIds,
      memo: form.memo,
      visibility: form.visibility,
      seriesId: form.seriesId,
      recurrenceRule
    });
  }

  const selectedUser = users.find((item) => item.id === form.ownerUserId);
  const selectedFacilities = facilities.filter((facility) => form.facilityIds.includes(facility.id));
  const participantNames = form.participantUserIds.map((userId) => userNameById(users, userId));
  const visibilityLabels: Record<ScheduleVisibility, string> = {
    public: "通常表示",
    busy: "予定あり表示",
    private: "完全非表示"
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog-card" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <p className="eyebrow">{schedule ? "edit schedule" : "new schedule"}</p>
            <h3>{schedule ? "予定を編集" : "予定を登録"}</h3>
          </div>
          <button className="small-button" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>

        <div className="detail-layout">
          <form className="form-grid detail-main" onSubmit={handleSubmit}>
            <label className="field full">
              <span>タイトル</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
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
              <span>作成者</span>
              <select value={form.ownerUserId} onChange={(event) => setForm({ ...form, ownerUserId: event.target.value })}>
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
                    {facility.name} / {facility.location}
                  </option>
                ))}
              </select>
            </label>
            <label className="field full">
              <span>公開範囲</span>
              <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ScheduleVisibility })}>
                <option value="public">通常表示</option>
                <option value="busy">予定あり表示</option>
                <option value="private">完全非表示</option>
              </select>
            </label>
            <div className="field full recurrence-box">
              <span>繰り返し</span>
              {schedule ? (
                <div className="hint-box">
                  <strong>{recurrenceSummary(schedule.recurrenceRule)}</strong>
                  <p>既存予定は新規登録時の繰り返し作成に対応しています。シリーズ全体の一括変更は次段階で追加できます。</p>
                </div>
              ) : (
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
              )}
            </div>
            <label className="field full">
              <span>メモ</span>
              <textarea rows={5} value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} />
            </label>
            <div className="dialog-actions full">
              {schedule ? (
                <button className="small-button danger-button" type="button" onClick={() => onDelete(schedule.id)}>
                  削除
                </button>
              ) : (
                <span />
              )}
              <button className="primary-button" type="submit">
                {schedule ? "更新する" : "登録する"}
              </button>
            </div>
          </form>

          <aside className="detail-side">
            <section className="detail-panel">
              <p className="eyebrow">summary</p>
              <h4>{form.title || "未入力の予定"}</h4>
              <dl className="detail-list">
                <div>
                  <dt>日時</dt>
                  <dd>
                    {formatDateTime(new Date(form.startAt).toISOString())}
                    {" - "}
                    {new Date(form.endAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                  </dd>
                </div>
                <div>
                  <dt>作成者</dt>
                  <dd>{selectedUser ? `${selectedUser.name} / ${selectedUser.department}` : "未選択"}</dd>
                </div>
                <div>
                  <dt>公開範囲</dt>
                  <dd>{visibilityLabels[form.visibility]}</dd>
                </div>
                <div>
                  <dt>繰り返し</dt>
                  <dd>{schedule ? recurrenceSummary(schedule.recurrenceRule) : recurrenceFrequency === "none" ? "単発予定" : recurrenceSummary({
                    frequency: recurrenceFrequency as Exclude<RecurrenceFrequency, "none">,
                    interval: recurrenceInterval,
                    until: recurrenceUntil,
                    weeklyDays
                  })}</dd>
                </div>
                <div>
                  <dt>設備</dt>
                  <dd>{selectedFacilities.length ? selectedFacilities.map((facility) => facility.name).join("、") : "なし"}</dd>
                </div>
              </dl>
            </section>

            <section className="detail-panel">
              <p className="eyebrow">participants</p>
              <h4>参加者</h4>
              <div className="chip-list">
                {participantNames.length ? participantNames.map((name) => <span key={name} className="detail-chip">{name}</span>) : <span className="empty-label">なし</span>}
              </div>
            </section>

            {schedule ? (
              <section className="detail-panel">
                <p className="eyebrow">record</p>
                <h4>更新情報</h4>
                <dl className="detail-list">
                  <div>
                    <dt>作成</dt>
                    <dd>{formatDateTime(schedule.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>更新</dt>
                    <dd>{formatDateTime(schedule.updatedAt)}</dd>
                  </div>
                </dl>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
