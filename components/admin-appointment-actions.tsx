"use client";

import { useState } from "react";

export function AdminAppointmentActions({ appointmentId }: { appointmentId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function update(status: "approved" | "rescheduled" | "cancelled" | "completed") {
    setBusy(true);
    setMessage("");
    let preferredAt: string | undefined;

    if (status === "rescheduled") {
      const value = window.prompt("Enter the new date and time, e.g. 2026-08-10T14:30:");
      if (!value) {
        setBusy(false);
        return;
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        setMessage("The rescheduled date is invalid.");
        setBusy(false);
        return;
      }
      preferredAt = date.toISOString();
    }

    const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, preferredAt })
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "Appointment action failed.");
      setBusy(false);
      return;
    }

    setMessage("Appointment updated.");
    setTimeout(() => location.reload(), 500);
  }

  return (
    <div>
      <div className="action-group">
        <button className="button approve" disabled={busy} onClick={() => update("approved")}>Approve</button>
        <button className="button ghost" disabled={busy} onClick={() => update("rescheduled")}>Reschedule</button>
        <button className="button danger" disabled={busy} onClick={() => update("cancelled")}>Cancel</button>
        <button className="button ghost" disabled={busy} onClick={() => update("completed")}>Complete</button>
      </div>
      {message && <div className="notice">{message}</div>}
    </div>
  );
}
