"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

type UploadedMedia = {
  path: string;
  mediaType: "image" | "video";
  sortOrder: number;
};

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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

    const form = new FormData(event.currentTarget);
    const supabase = createClient();

    let informationUpdated = false;
    let uploadedMediaPaths: string[] = [];
    let uploadedCertificatePath: string | null = null;

    try {
      const replacementImages = form
        .getAll("replacementImages")
        .filter(
          (item): item is File =>
            item instanceof File && item.size > 0
        );

      const videoValue = form.get("replacementVideo");
      const replacementVideo =
        videoValue instanceof File && videoValue.size > 0
          ? videoValue
          : null;

      const certificateValue = form.get(
        "replacementCertificate"
      );

      const replacementCertificate =
        certificateValue instanceof File &&
        certificateValue.size > 0
          ? certificateValue
          : null;

      /*
       * First update the gemstone information.
       */
      const updateResponse = await fetch(
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

      const updateResult = await updateResponse
        .json()
        .catch(() => ({}));

      if (!updateResponse.ok) {
        throw new Error(
          updateResult.error ??
            "Unable to update gemstone information."
        );
      }

      informationUpdated = true;

      const hasMediaReplacement =
        replacementImages.length > 0 ||
        replacementVideo !== null ||
        replacementCertificate !== null;

      /*
       * No new files were selected.
       */
      if (!hasMediaReplacement) {
        setMessage(
          "Gemstone updated and returned for administrator review."
        );

        setTimeout(() => {
          location.assign("/dashboard/seller");
        }, 900);

        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Your session expired. Please sign in again."
        );
      }

      const uploadedMedia: UploadedMedia[] = [];

      /*
       * Upload replacement photographs.
       */
      for (
        let index = 0;
        index < replacementImages.length;
        index += 1
      ) {
        const file = replacementImages[index];

        const path =
          `${user.id}/${gem.id}/replacements/` +
          `${crypto.randomUUID()}-${cleanFileName(
            file.name
          )}`;

        const { error } = await supabase.storage
          .from("gem-media")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });

        if (error) {
          throw error;
        }

        uploadedMediaPaths.push(path);

        uploadedMedia.push({
          path,
          mediaType: "image",
          sortOrder: index,
        });
      }

      /*
       * Upload replacement video.
       */
      if (replacementVideo) {
        const path =
          `${user.id}/${gem.id}/replacements/` +
          `${crypto.randomUUID()}-${cleanFileName(
            replacementVideo.name
          )}`;

        const { error } = await supabase.storage
          .from("gem-media")
          .upload(path, replacementVideo, {
            contentType: replacementVideo.type,
            upsert: false,
          });

        if (error) {
          throw error;
        }

        uploadedMediaPaths.push(path);

        uploadedMedia.push({
          path,
          mediaType: "video",
          sortOrder: 100,
        });
      }

      /*
       * Upload replacement certificate.
       */
      if (replacementCertificate) {
        const path =
          `${user.id}/${gem.id}/replacements/` +
          `${crypto.randomUUID()}-${cleanFileName(
            replacementCertificate.name
          )}`;

        const { error } = await supabase.storage
          .from("certificates-private")
          .upload(path, replacementCertificate, {
            contentType: replacementCertificate.type,
            upsert: false,
          });

        if (error) {
          throw error;
        }

        uploadedCertificatePath = path;
      }

      /*
       * Tell the secure API to replace only the
       * selected file categories.
       */
      const mediaResponse = await fetch(
        `/api/seller/listings/${gem.id}/media-replacement`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            replaceImages:
              replacementImages.length > 0,
            replaceVideo:
              replacementVideo !== null,
            replaceCertificate:
              replacementCertificate !== null,
            media: uploadedMedia,
            certificatePath:
              uploadedCertificatePath ?? "",
          }),
        }
      );

      const mediaResult = await mediaResponse
        .json()
        .catch(() => ({}));

      if (!mediaResponse.ok) {
        throw new Error(
          mediaResult.error ??
            "Unable to replace gemstone files."
        );
      }

      /*
       * The API accepted the files, so they must
       * not be removed by the error cleanup.
       */
      uploadedMediaPaths = [];
      uploadedCertificatePath = null;

      setMessage(
        "Gemstone information and files were updated and returned for administrator review."
      );

      setTimeout(() => {
        location.assign("/dashboard/seller");
      }, 1000);
    } catch (error) {
      /*
       * Remove newly uploaded files when the secure
       * replacement API did not accept them.
       */
      if (uploadedMediaPaths.length > 0) {
        await supabase.storage
          .from("gem-media")
          .remove(uploadedMediaPaths);
      }

      if (uploadedCertificatePath) {
        await supabase.storage
          .from("certificates-private")
          .remove([uploadedCertificatePath]);
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to update gemstone.";

      setMessage(
        informationUpdated
          ? `The information was updated, but file replacement failed: ${errorMessage}`
          : errorMessage
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

      <div className="panel">
        <h3>Replace media</h3>

        <p>
          Leave these fields empty to keep the existing
          photographs, video and certificate.
        </p>

        <label>
          New gemstone photographs
          <input
            name="replacementImages"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
          />
        </label>

        <label>
          New gemstone video
          <input
            name="replacementVideo"
            type="file"
            accept="video/mp4,video/webm"
          />
        </label>

        <label>
          New certificate image or PDF
          <input
            name="replacementCertificate"
            type="file"
            accept="image/jpeg,image/png,application/pdf"
          />
        </label>
      </div>

      <label>
        Reason for editing
        <textarea
          name="editReason"
          rows={3}
          placeholder="Example: I uploaded the wrong gemstone photograph."
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