"use client";

import { FormEvent, useState } from "react";
import { CURRENCY_CODES } from "@/data/currencies";

type EditableGem = {
  id: string;
  name: string;
  gem_type: string;
  variety: string | null;
  origin: string | null;
  carat: number;
  price: number;
  currency: string;
  treatment: string | null;
  clarity: string | null;
  cut: string | null;
  color: string | null;
  dimensions: string | null;
  description: string | null;
};

export function SellerEditForm({
  gem,
}: {
  gem: EditableGem;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const form = new FormData(event.currentTarget);

      const response = await fetch(
        `/api/seller/listings/${gem.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            name: form.get("name"),
            gemType: form.get("gemType"),
            variety: form.get("variety"),
            origin: form.get("origin"),
            carat: form.get("carat"),
            price: form.get("price"),
            currency: form.get("currency"),
            treatment: form.get("treatment"),
            clarity: form.get("clarity"),
            cut: form.get("cut"),
            color: form.get("color"),
            dimensions: form.get("dimensions"),
            description: form.get("description"),
            editReason: form.get("editReason"),
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to update gemstone."
        );
      }

      setMessage(
        "Gemstone updated and returned for administrator review."
      );

      setTimeout(() => {
        location.assign("/dashboard/seller");
      }, 900);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update gemstone."
      );
      setBusy(false);
    }
  }

  return (
    <form
      className="panel form-panel"
      onSubmit={submit}
    >
      <div>
        <span className="eyebrow">
          EDIT GEMSTONE
        </span>

        <h2>Update gemstone information.</h2>

        <p>
          After saving, the listing will return to
          administrator review.
        </p>
      </div>

      <div className="form-grid">
        <label>
          Gemstone name
          <input
            name="name"
            defaultValue={gem.name}
            required
          />
        </label>

        <label>
          Gem type
          <input
            name="gemType"
            defaultValue={gem.gem_type}
            required
          />
        </label>

        <label>
          Variety
          <input
            name="variety"
            defaultValue={gem.variety ?? ""}
          />
        </label>

        <label>
          Origin
          <input
            name="origin"
            defaultValue={gem.origin ?? ""}
          />
        </label>

        <label>
          Carat weight
          <input
            name="carat"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={gem.carat}
            required
          />
        </label>

        <label>
          Asking price
          <input
            name="price"
            type="number"
            min="1"
            step="0.01"
            defaultValue={gem.price}
            required
          />
        </label>

        <label>
          Currency
          <select
            name="currency"
            defaultValue={gem.currency}
          >
            {CURRENCY_CODES.map((currency) => (
              <option
                key={currency}
                value={currency}
              >
                {currency}
              </option>
            ))}
          </select>
        </label>

        <label>
          Treatment
          <input
            name="treatment"
            defaultValue={gem.treatment ?? ""}
          />
        </label>

        <label>
          Clarity
          <input
            name="clarity"
            defaultValue={gem.clarity ?? ""}
          />
        </label>

        <label>
          Cut
          <input
            name="cut"
            defaultValue={gem.cut ?? ""}
          />
        </label>

        <label>
          Colour
          <input
            name="color"
            defaultValue={gem.color ?? ""}
          />
        </label>

        <label>
          Dimensions
          <input
            name="dimensions"
            defaultValue={gem.dimensions ?? ""}
          />
        </label>
      </div>

      <label>
        Description
        <textarea
          name="description"
          rows={5}
          defaultValue={gem.description ?? ""}
          required
        />
      </label>

      <label>
        Reason for editing
        <textarea
          name="editReason"
          rows={3}
          placeholder="Example: I entered the wrong carat weight."
          minLength={10}
          maxLength={1000}
          required
        />
      </label>

      {message && (
        <div className="notice">{message}</div>
      )}

      <button
        type="submit"
        className="button primary"
        disabled={busy}
      >
        {busy
          ? "Saving changes..."
          : "Save Changes"}
      </button>
    </form>
  );
}