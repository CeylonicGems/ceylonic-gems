"use client";

import { useState } from "react";

export function SellerOfferActions({ offerId }: { offerId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function act(action: "accept" | "decline") {
    const confirmed =
      action === "accept"
        ? window.confirm("Accept this offer and create a buyer payment transaction?")
        : window.confirm("Decline this buyer offer?");
    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/seller/offers/${offerId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action })
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "Offer action failed.");
      setBusy(false);
      return;
    }

    setMessage(action === "accept" ? "Offer accepted. Buyer payment is now pending." : "Offer declined.");
    setTimeout(() => location.reload(), 600);
  }

  return (
    <div>
      <div className="action-group">
        <button className="button approve" type="button" disabled={busy} onClick={() => act("accept")}>
          Accept Offer
        </button>
        <button className="button danger" type="button" disabled={busy} onClick={() => act("decline")}>
          Decline
        </button>
      </div>
      {message && <div className="notice">{message}</div>}
    </div>
  );
}
