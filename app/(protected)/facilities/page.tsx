"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { listFacilities, listReservations, saveReservation } from "@/lib/data-service";
import { Facility, Reservation } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function FacilitiesPage() {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [form, setForm] = useState({
    facilityId: "f1",
    title: "",
    startAt: "2026-03-30T09:00",
    endAt: "2026-03-30T10:00",
    memo: ""
  });

  async function refresh() {
    setFacilities(await listFacilities());
    setReservations(await listReservations());
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    await saveReservation({
      facilityId: form.facilityId,
      title: form.title,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      userId: user.id,
      memo: form.memo
    });

    setForm({ facilityId: "f1", title: "", startAt: "2026-03-30T09:00", endAt: "2026-03-30T10:00", memo: "" });
    await refresh();
  }

  return (
    <div className="page-stack">
      <section className="surface-card">
        <p className="eyebrow">facility policy</p>
        <h3>設備予約</h3>
        <p className="muted">MVPでは重複予約を許可します。データ構造は将来の重複警告追加に対応しやすい形です。</p>
      </section>

      <section className="split-grid">
        <form className="surface-card" onSubmit={handleSubmit}>
          <p className="eyebrow">new reservation</p>
          <h3>予約登録</h3>
          <div className="form-grid">
            <label className="field full">
              <span>設備</span>
              <select value={form.facilityId} onChange={(event) => setForm({ ...form, facilityId: event.target.value })}>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name} / {facility.location}
                  </option>
                ))}
              </select>
            </label>
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
            <label className="field full">
              <span>メモ</span>
              <textarea rows={4} value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} />
            </label>
          </div>
          <button className="primary-button" type="submit">設備予約を保存</button>
        </form>

        <section className="surface-card">
          <p className="eyebrow">reservation list</p>
          <h3>予約一覧</h3>
          <div className="list-stack">
            {reservations.map((reservation) => {
              const facility = facilities.find((item) => item.id === reservation.facilityId);
              return (
                <article key={reservation.id} className="list-row">
                  <strong>{reservation.title}</strong>
                  <div className="list-meta">
                    <span>{facility?.name ?? "不明設備"}</span>
                    <span>{formatDateTime(reservation.startAt)}</span>
                  </div>
                  <p className="muted">{reservation.memo || "メモなし"}</p>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </div>
  );
}
