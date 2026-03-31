"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ScheduleDialog } from "@/components/schedule-dialog";
import { WeekBoard } from "@/components/week-board";
import { deleteSchedule, listFacilities, listSchedules, listUsers, saveSchedule } from "@/lib/data-service";
import { AppUser, Facility, ScheduleDraft, ScheduleItem } from "@/lib/types";
import { addDays, buildWeekDays, expandRecurringSchedules, formatDateKey, sortUsersForDisplay } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [department, setDepartment] = useState("all");
  const [weekBaseDate, setWeekBaseDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [draftUserId, setDraftUserId] = useState("");
  const [draftDate, setDraftDate] = useState(formatDateKey(new Date()));
  const [draftFacilityIds, setDraftFacilityIds] = useState<string[]>([]);

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

  const departments = useMemo(() => [...new Set(users.map((member) => member.department))], [users]);
  const weekDays = buildWeekDays(weekBaseDate);
  const pendingUsers = users.filter((member) => member.department === "未設定" || !member.mobile);

  function openNewSchedule(userId: string, dayKey: string) {
    setSelectedSchedule(null);
    setDraftUserId(userId);
    setDraftDate(dayKey);
    setDraftFacilityIds([]);
    setDialogOpen(true);
  }

  function openNewFacilitySchedule(facilityId: string, dayKey: string) {
    setSelectedSchedule(null);
    setDraftUserId(user?.id || users[0]?.id || "");
    setDraftDate(dayKey);
    setDraftFacilityIds([facilityId]);
    setDialogOpen(true);
  }

  function openExistingSchedule(schedule: ScheduleItem) {
    setSelectedSchedule(schedule);
    setDraftUserId(schedule.ownerUserId);
    setDraftDate(schedule.startAt.slice(0, 10));
    setDraftFacilityIds(schedule.facilityIds ?? []);
    setDialogOpen(true);
  }

  return (
    <div className="page-stack">
      <section className="surface-card">
        <div className="dashboard-toolbar">
          <div>
            <p className="eyebrow">weekly schedule</p>
            <h3>全体週間表示</h3>
          </div>
          <div className="toolbar-group">
            <label className="filter-field">
              <span className="filter-label">フィルター</span>
              <select value={department} onChange={(event) => setDepartment(event.target.value)}>
                <option value="all">全部</option>
                <option value="facilities">設備</option>
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
              <button className="small-button" type="button" onClick={() => setWeekBaseDate(new Date())}>
                今週
              </button>
              <span className="week-label">
                {weekDays[0]?.date} - {weekDays[6]?.date}
              </span>
              <button className="small-button" type="button" onClick={() => setWeekBaseDate((current) => addDays(current, 7))}>
                次週
              </button>
            </div>
            <button className="small-button" type="button" onClick={() => openNewSchedule(draftUserId || user?.id || users[0]?.id || "", draftDate)}>
              ＋予定追加
            </button>
            <span className="status-badge">
              {users.length}名 / {schedules.length}件
            </span>
          </div>
        </div>

        <WeekBoard
          users={users}
          facilities={facilities}
          schedules={schedules}
          department={department}
          baseDate={weekBaseDate}
          currentUserId={user?.id}
          onAddSchedule={openNewSchedule}
          onOpenSchedule={openExistingSchedule}
          onAddFacilitySchedule={openNewFacilitySchedule}
        />
      </section>

      {pendingUsers.length > 0 ? (
        <section className="surface-card onboarding-panel">
          <strong>初期設定待ちのメンバーがあります</strong>
          <p>
            {pendingUsers.length}名が「部署未設定」または「携帯番号未設定」です。管理画面から表示名・部署・表示順を揃えると、週間表がさらに見やすくなります。
          </p>
        </section>
      ) : null}

      {users.length === 0 ? (
        <section className="surface-card onboarding-panel">
          <strong>最初のメンバー準備</strong>
          <p>Firebase Authentication でユーザーを作成して一度ログインすると、ここにメンバーとして表示されます。</p>
        </section>
      ) : null}

      {facilities.length === 0 ? (
        <section className="surface-card onboarding-panel">
          <strong>設備マスターが未投入です</strong>
          <p>管理画面の「初期設備を投入」を押すと、会議室と車両の候補がまとめて入ります。</p>
        </section>
      ) : null}

      <ScheduleDialog
        open={dialogOpen}
        users={users}
        facilities={facilities}
        currentUserId={user?.id || ""}
        initialUserId={draftUserId}
        initialDate={draftDate}
        initialFacilityIds={draftFacilityIds}
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
