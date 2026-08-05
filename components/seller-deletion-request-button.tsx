"use client";

import { useState } from "react";

type SellerDeletionRequestButtonProps = {
  gemId: string;
  gemName: string;
  deletionRequested?: boolean;
};

export function SellerDeletionRequestButton({
  gemId,
  gemName,
  deletionRequested = false,
}: SellerDeletionRequestButtonProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function requestDeletion() {
    const reason = window.prompt(
      `Why do you want to delete "${gemName}"?\n\nPlease explain the mistake clearly.`
    );

    if (reason === null) {
      return;
    }

    if (reason.trim().length < 10) {
      setMessage(
        "Please enter a clear reason containing at least 10 characters."
      );
      return;
    }

    const confirmed = window.confirm(
      "Submit this deletion request to the administrator?\n\nThe gemstone will be hidden while the administrator reviews the request."
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/seller/listings/${gemId}/deletion-request`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            reason: reason.trim(),
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          result.error ?? "Unable to submit deletion request."
        );
        return;
      }

      setMessage(
        "Deletion request submitted for administrator review."
      );

      setTimeout(() => {
        location.reload();
      }, 700);
    } catch {
      setMessage("Unable to submit deletion request.");
    } finally {
      setBusy(false);
    }
  }

  if (deletionRequested) {
    return (
      <div>
        <button
          type="button"
          className="button ghost compact"
          disabled
        >
          Deletion Requested
        </button>

        <small>
          Waiting for administrator review.
        </small>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="button danger compact"
        disabled={busy}
        onClick={requestDeletion}
      >
        {busy ? "Submitting..." : "Request Deletion"}
      </button>

      {message && (
        <div className="notice">{message}</div>
      )}
    </div>
  );
}