"use client";

import { useState } from "react";
import type { PublicOffer } from "@/types";
import { CURRENCY_CODES } from "@/data/currencies";

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "LKR" ? 0 : 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function OfferPanel({
  gemId,
  gemName,
  initialOffers
}: {
  gemId: string;
  gemName: string;
  initialOffers: PublicOffer[];
}) {
  const [offers, setOffers] = useState(initialOffers);
  const [currency, setCurrency] = useState("LKR");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function step() {
    const value = Number(amount || 0);
    return value < 1000 ? 10 : value < 10000 ? 100 : value < 100000 ? 1000 : value < 1000000 ? 10000 : 50000;
  }

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) {
        throw new Error("Only a positive numeric amount is allowed.");
      }

      const response = await fetch("/api/offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gemId, amount: Number(amount), currency })
      });
      const result = await response.json();

      if (response.status === 401) {
        location.assign(`/login?role=buyer&next=/gems/${gemId}`);
        return;
      }
      if (!response.ok) throw new Error(result.error ?? "Offer failed.");

      setOffers(result.offers);
      setAmount("");
      setMessage("Your active offer was saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit offer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="row">
        <div>
          <h3>Public buyer offers</h3>
          <p>A maximum of five active offers is displayed.</p>
        </div>
        <span className="pill">Verified buyers</span>
      </div>

      <div className="offer-list">
        {offers.length ? (
          offers.slice(0, 5).map((offer) => (
            <div className="offer-row" key={offer.id}>
              <div>
                <strong>{offer.buyer_alias}</strong>
                <small>Verified buyer</small>
              </div>
              <strong>{money(offer.amount, offer.currency)}</strong>
            </div>
          ))
        ) : (
          <div className="empty-state">No public offers yet.</div>
        )}
      </div>

      <div className="offer-composer">
        <label>
          Currency
          <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </label>

        <label>
          Your offer for {gemName}
          <div className="amount-control">
            <input
              inputMode="decimal"
              value={amount}
              placeholder="Numbers only"
              onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
            />
            <div className="amount-arrows">
              <button type="button" aria-label="Increase offer" onClick={() => setAmount(String(Math.max(0, Number(amount || 0) + step())))}>▲</button>
              <button type="button" aria-label="Decrease offer" onClick={() => setAmount(String(Math.max(0, Number(amount || 0) - step())))}>▼</button>
            </div>
          </div>
        </label>

        <button className="button primary" type="button" onClick={submit} disabled={busy}>
          {busy ? "Submitting…" : "Submit or Update Offer"}
        </button>
        {message && <div className="notice">{message}</div>}
      </div>
    </section>
  );
}
