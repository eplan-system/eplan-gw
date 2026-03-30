"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { WeekBoard } from "@/components/week-board";
import { deleteSchedule, listFacilities, listSchedules, listUsers, saveSchedule } from "@/lib/data-service";
import { AppUser, Facility, ScheduleDraft, ScheduleItem } from "@/lib/types";
import { addDays, buildWeekDays, expandRecurringSchedules, formatDateKey, sortUsersForDisplay } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const todayKey = formatDateKey(new Date());
  const [users, setUsers] = useState<AppUser[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [department, setDepartment] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [draftUserId, setDraftUserId] = useState("");
  const [draftDate, setDraftDate] = useState(() => formatDateKey(new Date()));
  const [weekBaseDate, setWeekBaseDate] = useState(() => new Date());

  async function refresh() {
    const [nextUsers, nextSchedules, nextFacilities] = await Promise.all([listUsers(), listSchedules(), listFacilities()]);
    const orderedUsers = sortUsersForDisplay(nextUsers, user?.id);
    setUsers(orderedUsers);
    setSchedules(nextSchedules);
    setFacilities(nextFacilities);
    if (!draftUserId && orderedUsers[0]) {
      setDraftUserId(orderedUsers[0].id);
    }
  }

  useEffect(() => {
    void refresh();
  }, [user?.id]);

  const departments = [...new Set(users.map((user) => user.department))];
  const weekDays = buildWeekDays(weekBaseDate);

  return (
    <div className="page-stack">
      <section className="surface-card slim-card">
        <div className="dashboard-toolbar">
          <div>
            <p className="eyebrow">weekly schedule</p>
            <h3>全体週間表示</h3>
          </div>
          <div className="toolbar-group">
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
            <div className="week-switcher">
              <button className="small-button" type="button" onClick={() => setWeekBaseDate((current) => addDays(current, -7))}>
                前週
              </button>
              <span className="week-label">{weekDays[0]?.date} - {weekDays[6]?.date}</span>
              <button className="small-button" type="button" onClick={() => setWeekBaseDate((current) => addDays(current, 7))}>
                次週
              </button>
            </div>
            <button
              className="small-button"
              type="button"
              onClick={() => {
                setSelectedSchedule(null);
                setDraftUserId(users[0]?.id ?? "");
                setDraftDate(todayKey);
                setDialogOpen(true);
              }}
            >
              ＋ 予定追加
            </button>
            <span className="status-badge">{users.length}名 / {schedules.length}件</span>
          </div>
        </div>
        <WeekBoard
          users={users}
          schedules={schedules}
          department={department}
          baseDate={weekBaseDate}
          currentUserId={user?.id}
          onAddSchedule={(userId, dayKey) => {
            setSelectedSchedule(null);
            setDraftUserId(userId);
            setDraftDate(dayKey);
            setDialogOpen(true);
          }}
          onOpenSchedule={(schedule) => {
            setSelectedSchedule(schedule);
            setDraftUserId(schedule.ownerUserId);
            setDraftDate(schedule.startAt.slice(0, 10));
            setDialogOpen(true);
          }}
        />
        {users.some((user) => user.department === "未設定") ? (
          <div className="onboarding-panel">
            <strong>初期設定待ちのユーザーがあります</strong>
            <p>
              Authentication に追加して初回ログインした直後のユーザーは、部署や表示名が未設定のことがあります。
              `管理` からプロフィールを更新すると一覧表示が整います。
            </p>
          </div>
        ) : null}
        {users.length === 0 || schedules.length === 0 ? (
          <div className="onboarding-panel">
            <strong>スタート準備ガイド</strong>
            <p>
              まだデータが少ない状態です。まずは `管理` でプロフィール設定と初期設備投入を行い、そのあと空きセルから最初の予定を登録してください。
            </p>
          </div>
        ) : null}
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
            const items = expandRecurringSchedules(payload as ScheduleDraft);
            for (const item of items) {
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
