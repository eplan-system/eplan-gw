"use client";

import { AppUser, Facility, ScheduleItem } from "@/lib/types";
import {
  PeriodSegment,
  buildPeriodRows,
  buildWeekDays,
  formatDateKey,
  formatScheduleTimeLabel,
  getScheduleType,
  isHolidayKey,
  isSaturdayKey,
  isSundayKey,
  isTodayKey,
  localDateKeyFromIso,
  presentSchedule,
  scheduleIntersectsDay,
  schedulesForUserOnDay
} from "@/lib/utils";

type Props = {
  users: AppUser[];
  facilities?: Facility[];
  schedules: ScheduleItem[];
  department: string;
  baseDate: Date;
  currentUserId?: string;
  onAddSchedule: (userId: string, dayKey: string) => void;
  onOpenSchedule: (schedule: ScheduleItem) => void;
  onAddFacilitySchedule?: (facilityId: string, dayKey: string) => void;
};

function dayToneClass(dayKey: string) {
  if (isHolidayKey(dayKey) || isSundayKey(dayKey)) return "holiday-cell";
  if (isSaturdayKey(dayKey)) return "saturday-cell";
  return "";
}

function buildPeriodChipClass(segment: PeriodSegment, weekKeys: string[]) {
  const classes = ["period-chip"];
  const startKey = localDateKeyFromIso(segment.schedule.startAt);
  const endKey = formatDateKey(new Date(new Date(segment.schedule.endAt).getTime() - 1));

  if (segment.startColumn > 0 || startKey < weekKeys[0]) classes.push("continued-left");
  if (segment.endColumn < weekKeys.length - 1 || endKey > weekKeys[weekKeys.length - 1]) classes.push("continued-right");
  return classes.join(" ");
}

type PeriodLaneProps = {
  rows: PeriodSegment[][];
  weekKeys: string[];
  currentUserId?: string;
  onOpenSchedule: (schedule: ScheduleItem) => void;
};

function PeriodLaneRows({ rows, weekKeys, currentUserId, onOpenSchedule }: PeriodLaneProps) {
  if (!rows.length) return null;

  return (
    <div className="period-lane-stack">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="period-lane-row">
          {row.map((segment) => {
            const visible = presentSchedule(segment.schedule, currentUserId);
            if (!visible) return null;

            return (
              <button
                key={segment.schedule.id}
                type="button"
                className={buildPeriodChipClass(segment, weekKeys)}
                style={{ gridColumn: `${segment.startColumn + 1} / ${segment.endColumn + 2}` }}
                onClick={() => onOpenSchedule(segment.schedule)}
              >
                <strong>{visible.title}</strong>
                <span>{formatScheduleTimeLabel(segment.schedule)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function WeekBoard({
  users,
  facilities = [],
  schedules,
  department,
  baseDate,
  currentUserId,
  onAddSchedule,
  onOpenSchedule,
  onAddFacilitySchedule
}: Props) {
  const weekDays = buildWeekDays(baseDate);
  const weekKeys = weekDays.map((day) => day.key);
  const showFacilities = department === "all" || department === "facilities";
  const visibleUsers = department === "all" ? users : department === "facilities" ? [] : users.filter((user) => user.department === department);
  const visibleFacilities = showFacilities ? facilities : [];

  return (
    <div className="week-board-card">
      <div className="week-board-desktop">
        <div className="week-grid header">
          <div className="sticky-cell corner-cell">
            <strong>担当者区分</strong>
          </div>
          {weekDays.map((day) => (
            <div key={day.key} className={["day-cell", dayToneClass(day.key), isTodayKey(day.key) ? "today-cell" : ""].filter(Boolean).join(" ")}>
              <strong>{day.date}</strong>
              <span>{day.label}</span>
            </div>
          ))}
        </div>

        {visibleUsers.map((user) => {
          const userSchedules = schedules.filter(
            (schedule) =>
              (schedule.ownerUserId === user.id || schedule.participantUserIds.includes(user.id)) &&
              weekDays.some((day) => scheduleIntersectsDay(schedule, day.key))
          );
          const periodRows = buildPeriodRows(userSchedules, weekKeys);

          return (
            <div key={user.id} className="week-row-stack">
              <div className="week-grid">
                <div className="sticky-cell member-cell">
                  <div className="avatar-dot" style={{ background: user.color }} />
                  <div className="member-meta-block">
                    <strong>{user.name}</strong>
                    <span>{user.department || "部署未設定"}</span>
                    {!user.department || !user.mobile ? <small className="member-warning">プロフィール未設定</small> : null}
                  </div>
                </div>

                {weekDays.map((day) => {
                  const daySchedules = schedulesForUserOnDay(schedules, user.id, day.key)
                    .filter((schedule) => getScheduleType(schedule) !== "period")
                    .filter((schedule) => presentSchedule(schedule, currentUserId))
                    .sort((left, right) => left.startAt.localeCompare(right.startAt));

                  return (
                    <div
                      key={`${user.id}-${day.key}`}
                      className={["schedule-cell", "interactive-cell", dayToneClass(day.key), isTodayKey(day.key) ? "today-cell" : ""].filter(Boolean).join(" ")}
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
                        <>
                          {daySchedules.map((schedule) => {
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
                                <span>{formatScheduleTimeLabel(schedule)}</span>
                                {schedule.facilityIds?.length ? <small>設備 {schedule.facilityIds.length}件</small> : null}
                              </button>
                            );
                          })}
                          <button
                            className="add-cell-button"
                            type="button"
                            aria-label="予定を追加"
                            title="予定を追加"
                            onClick={(event) => {
                              event.stopPropagation();
                              onAddSchedule(user.id, day.key);
                            }}
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <div className="cell-placeholder cell-placeholder-minimal" aria-hidden="true">
                          +
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {periodRows.length ? (
                <div className="week-grid period-grid">
                  <div className="sticky-cell period-label-cell">
                    <span>期間予定</span>
                  </div>
                  <div className="period-grid-body">
                    <PeriodLaneRows rows={periodRows} weekKeys={weekKeys} currentUserId={currentUserId} onOpenSchedule={onOpenSchedule} />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {visibleFacilities.map((facility) => {
          const facilitySchedules = schedules.filter(
            (schedule) => schedule.facilityIds?.includes(facility.id) && weekDays.some((day) => scheduleIntersectsDay(schedule, day.key))
          );
          const periodRows = buildPeriodRows(facilitySchedules, weekKeys);

          return (
            <div key={facility.id} className="week-row-stack">
              <div className="week-grid">
                <div className="sticky-cell member-cell facility-cell-head">
                  <div className="avatar-dot facility-dot" />
                  <div className="member-meta-block">
                    <strong>{facility.name}</strong>
                    <span>設備</span>
                  </div>
                </div>

                {weekDays.map((day) => {
                  const daySchedules = facilitySchedules
                    .filter((schedule) => scheduleIntersectsDay(schedule, day.key))
                    .filter((schedule) => getScheduleType(schedule) !== "period")
                    .filter((schedule) => presentSchedule(schedule, currentUserId))
                    .sort((left, right) => left.startAt.localeCompare(right.startAt));

                  return (
                    <div
                      key={`${facility.id}-${day.key}`}
                      className={["schedule-cell", "interactive-cell", "facility-schedule-cell", dayToneClass(day.key), isTodayKey(day.key) ? "today-cell" : ""]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => onAddFacilitySchedule?.(facility.id, day.key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if ((event.key === "Enter" || event.key === " ") && onAddFacilitySchedule) {
                          event.preventDefault();
                          onAddFacilitySchedule(facility.id, day.key);
                        }
                      }}
                    >
                      {daySchedules.length ? (
                        <>
                          {daySchedules.map((schedule) => {
                            const visible = presentSchedule(schedule, currentUserId);
                            if (!visible) return null;

                            return (
                              <button
                                key={schedule.id}
                                className="schedule-chip schedule-button facility-chip"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenSchedule(schedule);
                                }}
                              >
                                <strong>{visible.title}</strong>
                                <span>{formatScheduleTimeLabel(schedule)}</span>
                              </button>
                            );
                          })}
                          <button
                            className="add-cell-button"
                            type="button"
                            aria-label="設備予定を追加"
                            title="設備予定を追加"
                            onClick={(event) => {
                              event.stopPropagation();
                              onAddFacilitySchedule?.(facility.id, day.key);
                            }}
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <div className="cell-placeholder cell-placeholder-minimal" aria-hidden="true">
                          +
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {periodRows.length ? (
                <div className="week-grid period-grid">
                  <div className="sticky-cell period-label-cell facility-cell-head">
                    <span>期間予定</span>
                  </div>
                  <div className="period-grid-body">
                    <PeriodLaneRows rows={periodRows} weekKeys={weekKeys} currentUserId={currentUserId} onOpenSchedule={onOpenSchedule} />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
