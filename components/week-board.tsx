"use client";

import { AppUser, ScheduleItem } from "@/lib/types";
import { buildWeekDays, isTodayKey, presentSchedule, schedulesForUserOnDay } from "@/lib/utils";

type Props = {
  users: AppUser[];
  schedules: ScheduleItem[];
  department: string;
  baseDate: Date;
  currentUserId?: string;
  onAddSchedule: (userId: string, dayKey: string) => void;
  onOpenSchedule: (schedule: ScheduleItem) => void;
};

export function WeekBoard({ users, schedules, department, baseDate, currentUserId, onAddSchedule, onOpenSchedule }: Props) {
  const weekDays = buildWeekDays(baseDate);
  const visibleUsers = department === "all" ? users : users.filter((user) => user.department === department);

  return (
    <div className="week-board-card">
      <div className="week-board-desktop">
        <div className="week-grid header">
          <div className="sticky-cell corner-cell">
            <strong>社員</strong>
            <span>部署</span>
          </div>
          {weekDays.map((day) => (
            <div key={day.key} className={isTodayKey(day.key) ? "day-cell today-cell" : "day-cell"}>
              <strong>{day.label}</strong>
              <span>{day.date}</span>
            </div>
          ))}
        </div>

        {visibleUsers.map((user) => (
          <div key={user.id} className="week-grid">
            <div className="sticky-cell member-cell">
              <div className="avatar-dot" style={{ background: user.color }} />
              <div className="member-meta-block">
                <strong>{user.name}</strong>
                <span>{user.department}</span>
                {user.department === "未設定" ? <small className="member-warning">プロフィール未設定</small> : null}
              </div>
            </div>
            {weekDays.map((day) => {
              const daySchedules = schedulesForUserOnDay(schedules, user.id, day.key)
                .filter((schedule) => presentSchedule(schedule, currentUserId))
                .sort((left, right) => left.startAt.localeCompare(right.startAt));

              return (
                <div
                  key={`${user.id}-${day.key}`}
                  className={isTodayKey(day.key) ? "schedule-cell today-cell interactive-cell" : "schedule-cell interactive-cell"}
                  onClick={() => onAddSchedule(user.id, day.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onAddSchedule(user.id, day.key);
                    }
                  }}
                >
                  {daySchedules.length ? (
                    daySchedules.map((schedule) => {
                      const visible = presentSchedule(schedule, currentUserId);
                      if (!visible) return null;

                      return (
                        <button
                          key={schedule.id}
                          className="schedule-chip schedule-button"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenSchedule(schedule);
                          }}
                        >
                          <strong>{visible.title}</strong>
                          <span>
                            {new Date(schedule.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                            {" - "}
                            {new Date(schedule.endAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {schedule.facilityIds?.length ? <small>設備 {schedule.facilityIds.length}件</small> : null}
                          {visible.memo ? <p>{visible.memo}</p> : null}
                        </button>
                      );
                    })
                  ) : (
                    <div className="cell-placeholder">クリックで追加</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="week-board-mobile">
        {visibleUsers.map((user) => (
          <section key={user.id} className="mobile-user-card">
            <div className="mobile-user-head">
              <div className="avatar-dot" style={{ background: user.color }} />
              <div>
                <strong>{user.name}</strong>
                <span>{user.department}</span>
              </div>
            </div>
            <div className="mobile-day-list">
              {weekDays.map((day) => {
                const daySchedules = schedulesForUserOnDay(schedules, user.id, day.key).filter((schedule) => presentSchedule(schedule, currentUserId));

                return (
                  <div key={`${user.id}-${day.key}`} className="mobile-day-row">
                    <strong>{day.label} {day.date}</strong>
                    {daySchedules.length ? (
                      <>
                        {daySchedules.map((schedule) => {
                          const visible = presentSchedule(schedule, currentUserId);
                          if (!visible) return null;

                          return (
                            <button
                              key={schedule.id}
                              className="mobile-schedule-button"
                              type="button"
                              onClick={() => onOpenSchedule(schedule)}
                            >
                              <span>{visible.title}</span>
                              <small>{new Date(schedule.startAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</small>
                            </button>
                          );
                        })}
                        <button className="small-button" type="button" onClick={() => onAddSchedule(user.id, day.key)}>
                          この日に追加
                        </button>
                      </>
                    ) : (
                      <button className="small-button" type="button" onClick={() => onAddSchedule(user.id, day.key)}>
                        この日に追加
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
