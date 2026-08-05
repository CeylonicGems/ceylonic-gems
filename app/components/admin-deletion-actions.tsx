"use client";

import { useState } from "react";

type AdminDeletionActionsProps = {
  listingId: string;
};

export function AdminDeletionActions({
  listingId,
}: AdminDeletionActionsProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function reviewDeletion(
    action: "approve_delete" | "reject_request"
  ) {
    let adminNote = "";

    if (action === "approve_delete") {
      const confirmed = window.confirm(
        "Permanently delete this gemstone?\n\n" +
          "The gemstone listing, media and certificates will be removed. " +
          "This action cannot be undone."
      );

      if (!confirmed) return;
    }

    if (action === "reject_request") {
      adminNote =
        window.prompt(
          "Why are you rejecting this deletion request?"
        ) ?? "";

      if (adminNote.trim().length < 5) {
        setMessage(
          "Please provide a rejection reason."
        );
        return;
      }
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/listings/${listingId}/deletion-request`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            action,
            adminNote: adminNote.trim(),
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setMessage(
          result.error ??
            "Unable to review deletion request."
        );
        return;
      }

      setMessage(
        action === "approve_delete"
          ? "Gemstone permanently deleted."
          : "Deletion request rejected."
      );

      setTimeout(() => {
        location.reload();
      }, 700);
    } catch {
      setMessage(
        "Unable to review deletion request."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="action-group">
        <button
          type="button"
          className="button danger"
          disabled={busy}
          onClick={() =>
            reviewDeletion("approve_delete")
          }
        >
          {busy ? "Please wait..." : "Approve Delete"}
        </button>

        <button
          type="button"
          className="button ghost"
          disabled={busy}
          onClick={() =>
            reviewDeletion("reject_request")
          }
        >
          Reject Request
        </button>
      </div>

      {message && (
        <div className="notice">{message}</div>
      )}
    </div>
  );
}