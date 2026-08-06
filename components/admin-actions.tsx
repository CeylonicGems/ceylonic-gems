"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useState,
} from "react";

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
  const [reviewBusy, setReviewBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<ReviewFile[]>([]);

  const loadFiles = useCallback(
    async (showSuccessMessage: boolean) => {
      setReviewBusy(true);

      try {
        const response = await fetch(
          `/api/admin/listings/${listingId}/files`,
          {
            cache: "no-store",
          }
        );

        const result = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error ?? "Review files failed."
          );
        }

        setFiles(result.files ?? []);

        if (showSuccessMessage) {
          setMessage(
            "Media loaded. Secure file links expire in five minutes."
          );
        }
      } catch (error) {
        setFiles([]);

        setMessage(
          error instanceof Error
            ? error.message
            : "Review files failed."
        );
      } finally {
        setReviewBusy(false);
      }
    },
    [listingId]
  );

  /*
   * Automatically load the seller's current media
   * when the admin approval card appears.
   */
  useEffect(() => {
    void loadFiles(false);
  }, [loadFiles]);

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
          body: JSON.stringify({
            action,
            note,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      setMessage(
        response.ok
          ? "Listing updated."
          : result.error ?? "Action failed."
      );

      if (response.ok) {
        setTimeout(() => {
          location.reload();
        }, 500);
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
          result.error ??
            "Unable to delete gemstone."
        );

        return;
      }

      setMessage(
        "Gemstone deleted successfully."
      );

      setTimeout(() => {
        location.reload();
      }, 500);
    } catch {
      setMessage(
        "Unable to delete gemstone."
      );
    } finally {
      setBusy(false);
    }
  }

  const images = files.filter(
    (file) => file.type === "image"
  );

  const videos = files.filter(
    (file) => file.type === "video"
  );

  const certificates = files.filter(
    (file) => file.type === "certificate"
  );

  return (
    <div>
      {reviewBusy && (
        <div className="notice">
          Loading seller media...
        </div>
      )}

      {images.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <strong>
            Seller uploaded photographs
          </strong>

          {images.map((file, index) => (
            <div
              className="panel"
              key={`${file.url}-${index}`}
            >
              <img
                src={file.url}
                alt={`Seller gemstone photograph ${
                  index + 1
                }`}
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: "440px",
                  objectFit: "contain",
                  borderRadius: "12px",
                  marginBottom: "12px",
                }}
              />

              <a
                className="button ghost compact"
                href={file.url}
                target="_blank"
                rel="noreferrer"
              >
                Open full image {index + 1}
              </a>
            </div>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <strong>
            Seller uploaded video
          </strong>

          {videos.map((file, index) => (
            <div
              className="panel"
              key={`${file.url}-${index}`}
            >
              <video
                controls
                preload="metadata"
                src={file.url}
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: "440px",
                  borderRadius: "12px",
                  marginBottom: "12px",
                }}
              />

              <a
                className="button ghost compact"
                href={file.url}
                target="_blank"
                rel="noreferrer"
              >
                Open full video
              </a>
            </div>
          ))}
        </div>
      )}

      {certificates.length > 0 && (
        <div
          className="private-file-links"
          style={{
            marginBottom: "20px",
          }}
        >
          <strong>
            Seller certificates
          </strong>

          {certificates.map((file, index) => (
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

      <div className="action-group">
        <button
          type="button"
          className="button ghost"
          disabled={busy || reviewBusy}
          onClick={() => {
            setMessage("");
            void loadFiles(true);
          }}
        >
          {reviewBusy
            ? "Loading Media..."
            : "Refresh Media & Certificates"}
        </button>

        <button
          type="button"
          className="button approve"
          disabled={
            busy ||
            reviewBusy ||
            paymentStatus !== "paid"
          }
          onClick={() => act("approve")}
        >
          Publish
        </button>

        <button
          type="button"
          className="button ghost"
          disabled={busy || reviewBusy}
          onClick={() =>
            act("changes_requested")
          }
        >
          Request Changes
        </button>

        <button
          type="button"
          className="button danger"
          disabled={busy || reviewBusy}
          onClick={() => act("reject")}
        >
          Reject
        </button>

        <button
          type="button"
          className="button danger"
          disabled={busy || reviewBusy}
          onClick={deleteListing}
        >
          {busy
            ? "Please wait..."
            : "Delete Gemstone"}
        </button>
      </div>

      {paymentStatus !== "paid" && (
        <small>
          Publication is locked until the listing
          fee is paid.
        </small>
      )}

      {message && (
        <div className="notice">
          {message}
        </div>
      )}
    </div>
  );
}