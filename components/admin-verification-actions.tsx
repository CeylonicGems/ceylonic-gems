"use client";

import { useState } from "react";

type SignedFile = { label: string; url: string };

export function AdminVerificationActions({ verificationId }: { verificationId: string }) {
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<SignedFile[]>([]);
  const [message, setMessage] = useState("");

  async function reviewFiles() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/verifications/${verificationId}/files`, {
        cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to open documents.");
      setFiles(result.files ?? []);
      setMessage("Private links expire in five minutes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Document review failed.");
    } finally {
      setBusy(false);
    }
  }

  async function act(status: "verified" | "rejected") {
    setBusy(true);
    const note =
      status === "rejected"
        ? window.prompt("Reason for rejection:") ?? ""
        : "Approved by administrator";

    if (status === "rejected" && !note.trim()) {
      setBusy(false);
      return;
    }

    const response = await fetch(`/api/admin/verifications/${verificationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, note })
    });

    if (response.ok) location.reload();
    else {
      const result = await response.json();
      setMessage(result.error ?? "Action failed.");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="action-group">
        <button className="button ghost" type="button" disabled={busy} onClick={reviewFiles}>
          Review Private Files
        </button>
        <button className="button approve" type="button" disabled={busy} onClick={() => act("verified")}>
          Verify Account
        </button>
        <button className="button danger" type="button" disabled={busy} onClick={() => act("rejected")}>
          Reject
        </button>
      </div>

      {files.length > 0 && (
        <div className="private-file-links">
          {files.map((file) => (
            <a key={file.label} className="button ghost compact" href={file.url} target="_blank" rel="noreferrer">
              Open {file.label}
            </a>
          ))}
        </div>
      )}
      {message && <div className="notice">{message}</div>}
    </div>
  );
}
