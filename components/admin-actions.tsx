"use client";

import { useState } from "react";

type ReviewFile = {
  label: string;
  url: string;
  type: string;
};

export function AdminListingActions({
  listingId,
  paymentStatus,
}: {
  listingId: string;
  paymentStatus: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<ReviewFile[]>([]);

  async function review() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/listings/${listingId}/files`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Review files failed.");
      } else {
        setFiles(result.files ?? []);
        setMessage(
          "Certificate links expire in five minutes."
        );
      }
    } catch {
      setMessage("Review files failed.");
    } finally {
      setBusy(false);
    }
  }

  async function act(
    action: "approve" | "changes_requested" | "reject"
  ) {
    setBusy(true);
    setMessage("");

    const note =
      action === "approve"
        ? ""
        : window.prompt(
            action === "reject"
              ? "Reason for rejection:"
              : "What should the seller change?"
          ) ?? "";

    if (action !== "approve" && !note.trim()) {
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/listings/${listingId}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ action, note }),
        }
      );

      const result = await response.json();

      setMessage(
        response.ok
          ? "Listing updated."
          : result.error ?? "Action failed."
      );

      if (response.ok) {
        setTimeout(() => location.reload(), 500);
      }
    } catch {
      setMessage("Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteListing() {
    const confirmed = window.confirm(
      "Permanently delete this gemstone?\n\n" +
        "The listing, gemstone media and certificates will be removed. " +
        "This action cannot be undone."
    );

    if (!confirmed) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/listings/${listingId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setMessage(
          result.error ?? "Unable to delete gemstone."
        );
        return;
      }

      setMessage("Gemstone deleted successfully.");

      setTimeout(() => {
        location.reload();
      }, 500);
    } catch {
      setMessage("Unable to delete gemstone.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="action-group">
        <button
          type="button"
          className="button ghost"
          disabled={busy}
          onClick={review}
        >
          Review Media & Certificates
        </button>

        <button
          type="button"
          className="button approve"
          disabled={busy || paymentStatus !== "paid"}
          onClick={() => act("approve")}
        >
          Publish
        </button>

        <button
          type="button"
          className="button ghost"
          disabled={busy}
          onClick={() => act("changes_requested")}
        >
          Request Changes
        </button>

        <button
          type="button"
          className="button danger"
          disabled={busy}
          onClick={() => act("reject")}
        >
          Reject
        </button>

        <button
          type="button"
          className="button danger"
          disabled={busy}
          onClick={deleteListing}
        >
          {busy ? "Please wait..." : "Delete Gemstone"}
        </button>
      </div>

      {files.length > 0 && (
        <div className="private-file-links">
          {files.map((file, index) => (
            <a
              className="button ghost compact"
              key={`${file.url}-${index}`}
              href={file.url}
              target="_blank"
              rel="noreferrer"
            >
              Open {file.label}
            </a>
          ))}
        </div>
      )}

      {paymentStatus !== "paid" && (
        <small>
          Publication is locked until the listing fee is paid.
        </small>
      )}

      {message && (
        <div className="notice">{message}</div>
      )}
    </div>
  );
}