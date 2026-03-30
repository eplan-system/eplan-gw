"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { WeekBoard } from "@/components/week-board";
import { deleteSchedule, listFacilities, listSchedules, listUsers, saveSchedule } from "@/lib/data-service";
import { AppUser, Facility, ScheduleDraft, ScheduleItem, ScheduleViewMode } from "@/lib/types";
import {
  addDays,
  buildIcsFile,
  buildMonthDays,
  buildWeekDays,
  canViewSchedule,
  expandRecurringSchedules,
  formatDateKey,
  formatDateTime,
  isTodayKey,
  presentSchedule,
  schedulesForUserInMonth,
  sortUsersForDisplay,
  userNameById
} from "@/lib/utils";

const modes: { key: ScheduleViewMode; label: string }[] = [
  { key: "team-week", label: "全体週間" },
  { key: "personal-month", label: "個人月間" },
  { key: "personal-week", label: "個人週間" },
  { key: "personal-day", label: "個人日" }
];

export default function SchedulesPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [mode, setMode] = useState<ScheduleViewMode>("personal-month");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [department, setDepartment] = useState("all");
  const [calendarBase, setCalendarBase] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [draftUserId, setDraftUserId] = useState("");
  const [draftDate, setDraftDate] = useState(formatDateKey(new Date()));

  async function refresh() {
    const [nextUsers, nextItems, nextFacilities] = await Promise.all([listUsers(), listSchedules(), listFacilities()]);
    const orderedUsers = sortUsersForDisplay(nextUsers, user?.id);
    setUsers(orderedUsers);
    setItems(nextItems);
    setFacilities(nextFacilities);

    if (!selectedUserId && orderedUsers[0]) {
      setSelectedUserId(user?.id ?? orderedUsers[0].id);
    }

    if (!draftUserId && orderedUsers[0]) {
      setDraftUserId(orderedUsers[0].id);
    }
  }

  useEffect(() => {
    void refresh();
  }, [user?.id]);

  const targetUserId = selectedUserId || user?.id || users[0]?.id || "";
  const departments = [...new Set(users.map((member) => member.department))];
  const monthDays = buildMonthDays(calendarBase);
  const weekDays = buildWeekDays(calendarBase);
  const monthSchedules = schedulesForUserInMonth(items, targetUserId, calendarBase);
  const personalSchedules = items
    .filter((item) => item.ownerUserId === targetUserId || item.participantUserIds.includes(targetUserId))
    .filter((item) => canViewSchedule(item, user?.id))
    .sort((left, right) => left.startAt.localeCompare(right.startAt));

  const ownSchedules = items
    .filter((item) => item.ownerUserId === user?.id || item.participantUserIds.includes(user?.id ?? ""))
    .sort((left, right) => left.startAt.localeCompare(right.startAt));

  const filteredSchedules = useMemo(() => {
    if (mode === "personal-day") {
      const dayKey = formatDateKey(calendarBase);
      return personalSchedules.filter((item) => item.startAt.slice(0, 10) === dayKey);
    }

    if (mode === "personal-week") {
      const weekKeys = new Set(weekDays.map((day) => day.key));
      return personalSchedules.filter((item) => weekKeys.has(item.startAt.slice(0, 10)));
    }

    return personalSchedules;
  }, [calendarBase, mode, personalSchedules, weekDays]);

  function openNewSchedule(userId: string, dayKey: string) {
    setSelectedSchedule(null);
    setDraftUserId(userId);
    setDraftDate(dayKey);
    setDialogOpen(true);
  }

  function openExistingSchedule(schedule: ScheduleItem) {
    setSelectedSchedule(schedule);
    setDraftUserId(schedule.ownerUserId);
    setDraftDate(schedule.startAt.slice(0, 10));
    setDialogOpen(true);
  }

  function downloadIcs() {
    if (!user) return;
    const content = buildIcsFile(ownSchedules, `${user.name}-schedule`);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-schedule.ics";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-stack">
      <section className="surface-card">
        <div className="dashboard-toolbar">
          <div>
            <p className="eyebrow">schedule modes</p>
            <h3>表示モード</h3>
          </div>
          <div className="toolbar-group">
            <div className="tab-list">
              {modes.map((item) => (
                <button key={item.key} className={mode === item.key ? "tab-button active" : "tab-button"} onClick={() => setMode(item.key)} type="button">
                  {item.label}
                </button>
              ))}
            </div>
            <button className="small-button" type="button" onClick={downloadIcs}>
              iCal出力
            </button>
            {mode === "team-week" ? (
              <label className="compact-filter">
                <span>部署</span>
                <select value={department} onChange={(event) => setDepartment(event.target.value)}>
                  <option value="all">全部署</option>
                  {departments.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="compact-filter">
                <span>対象</span>
                <select value={targetUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                  {users.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.id === user?.id ? `${member.name}（自分）` : member.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        {mode === "team-week" ? (
          <>
            <div className="dashboard-toolbar">
              <strong>全体週間表示</strong>
              <div className="week-switcher">
                <button className="small-button" type="button" onClick={() => setCalendarBase((current) => addDays(current, -7))}>
                  前週
                </button>
                <span className="week-label">
                  {weekDays[0]?.date} - {weekDays[6]?.date}
                </span>
                <button className="small-button" type="button" onClick={() => setCalendarBase((current) => addDays(current, 7))}>
                  次週
                </button>
              </div>
            </div>
            <WeekBoard
              users={users}
              schedules={items}
              department={department}
              baseDate={calendarBase}
              currentUserId={user?.id}
              onAddSchedule={openNewSchedule}
              onOpenSchedule={openExistingSchedule}
            />
          </>
        ) : null}

        {mode === "personal-month" ? (
          <div className="month-view-card">
            <div className="dashboard-toolbar">
              <strong>
                {calendarBase.getFullYear()}年 {calendarBase.getMonth() + 1}月
              </strong>
              <div className="week-switcher">
                <button className="small-button" type="button" onClick={() => setCalendarBase((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
                  前月
                </button>
                <button className="small-button" type="button" onClick={() => setCalendarBase(new Date())}>
                  今月
                </button>
                <button className="small-button" type="button" onClick={() => setCalendarBase((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
                  次月
                </button>
              </div>
            </div>
            <div className="month-grid month-header">
              {["月", "火", "水", "木", "金", "土", "日"].map((label) => (
                <div key={label} className="month-cell month-cell-header">
                  <strong>{label}</strong>
                </div>
              ))}
            </div>
            <div className="month-grid">
              {monthDays.map((day) => {
                const daySchedules = monthSchedules
                  .filter((item) => item.startAt.slice(0, 10) === day.key)
                  .filter((item) => canViewSchedule(item, user?.id))
                  .slice(0, 3);

                return (
                  <div
                    key={day.key}
                    className={
                      [
                        "month-cell",
                        "month-cell-interactive",
                        !day.isCurrentMonth ? "month-cell-muted" : "",
                        isTodayKey(day.key) ? "today-cell" : ""
                      ].filter(Boolean).join(" ")
                    }
                    onClick={() => openNewSchedule(targetUserId, day.key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openNewSchedule(targetUserId, day.key);
                      }
                    }}
                  >
                    <div className="month-cell-top">
                      <strong>{day.day}</strong>
                    </div>
                    <div className="month-schedule-list">
                      {daySchedules.length ? (
                        daySchedules.map((item) => {
                          const visible = presentSchedule(item, user?.id);
                          if (!visible) return null;

                          return (
                            <button
                              key={item.id}
                              className="month-schedule-chip month-schedule-button"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openExistingSchedule(item);
                              }}
                            >
                              <span>{new Date(item.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
                              <strong>{visible.title}</strong>
                            </button>
                          );
                        })
                      ) : (
                        <div className="cell-placeholder">クリックで追加</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {mode !== "team-week" && mode !== "personal-month" ? (
          <div className="list-stack">
            <p className="muted">
              {mode === "personal-week" ? "選択ユーザーの今週予定を一覧で確認できます。" : "選択日の予定を一覧で確認できます。"}
            </p>
            {filteredSchedules.map((item) => {
              const visible = presentSchedule(item, user?.id);
              if (!visible) return null;

              return (
                <article key={item.id} className="list-row">
                  <strong>{visible.title}</strong>
                  <div className="list-meta">
                    <span>{formatDateTime(item.startAt)}</span>
                    <span>作成者 {userNameById(users, item.ownerUserId)}</span>
                  </div>
                  {visible.memo ? <p className="muted">{visible.memo}</p> : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="surface-card">
        <p className="eyebrow">schedule note</p>
        <h3>予定登録について</h3>
        <p className="muted">
          予定追加機能はすでに実装済みです。`トップ` の週間表、`予定` の全体週間、個人月間の各日セルから同じ登録ダイアログで入力できます。
          `iCal出力` はログイン中の自分の予定を書き出すので、Google カレンダーへインポートして使えます。
        </p>
      </section>

      <ScheduleDialog
        open={dialogOpen}
        users={users}
        facilities={facilities}
        initialUserId={draftUserId}
        initialDate={draftDate}
        schedule={selectedSchedule}
        onClose={() => setDialogOpen(false)}
        onSave={async (payload) => {
          if (!payload.id && payload.recurrenceRule) {
            const expanded = expandRecurringSchedules(payload as ScheduleDraft);
            for (const item of expanded) {
              await saveSchedule(item);
            }
          } else {
            await saveSchedule(payload);
          }
          setDialogOpen(false);
          await refresh();
        }}
        onDelete={async (scheduleId) => {
          await deleteSchedule(scheduleId);
          setDialogOpen(false);
          await refresh();
        }}
      />
    </div>
  );
}
