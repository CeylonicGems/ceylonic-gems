import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
type ChangeValue = string | number | null;

type SavedEditChange = {
  before?: ChangeValue;
  after?: ChangeValue;
};

type SavedEditChanges = Record<string, SavedEditChange>;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = String(body.action ?? "");
    const note = String(body.note ?? "")
      .trim()
      .slice(0, 1500);

    const admin = createAdminClient();

    const { data: gem, error: gemError } = await admin
      .from("gems")
      .select(`
        payment_status,
        name,
        status,
        edit_previous_status,
        seller_edited_at,
        seller_edit_changes
      `)
      .eq("id", id)
      .maybeSingle();

    if (gemError) {
      throw gemError;
    }

    if (!gem) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }

    const isSellerEdit =
      Boolean(gem.seller_edited_at) &&
      Boolean(gem.edit_previous_status);

    if (action === "approve") {
      if (gem.payment_status !== "paid") {
        return NextResponse.json(
          {
            error:
              "The listing fee has not been paid.",
          },
          { status: 409 }
        );
      }

      const { error: updateError } = await admin
        .from("gems")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          admin_note: null,

          seller_edit_reason: null,
          seller_edit_changes: {},
          seller_edited_at: null,
          edit_previous_status: null,
        })
        .eq("id", id);

      if (updateError) {
        throw updateError;
      }
    } else if (
      action === "changes_requested" &&
      note
    ) {
      const { error: updateError } = await admin
        .from("gems")
        .update({
          status: "changes_requested",
          admin_note: note,
        })
        .eq("id", id);

      if (updateError) {
        throw updateError;
      }
    } else if (action === "reject" && note) {
      /*
       * Rejecting an edit to a previously published
       * gemstone must restore the old information and
       * return the listing to the Gem Lobby.
       */
      if (isSellerEdit) {
        const changes =
          gem.seller_edit_changes &&
          typeof gem.seller_edit_changes === "object" &&
          !Array.isArray(gem.seller_edit_changes)
            ? (gem.seller_edit_changes as SavedEditChanges)
            : {};

        const restoredValues: Record<string, unknown> = {
          status: gem.edit_previous_status,
          published_at:
            gem.edit_previous_status === "published"
              ? new Date().toISOString()
              : null,

          admin_note: `Seller edit rejected: ${note}`,

          seller_edit_reason: null,
          seller_edit_changes: {},
          seller_edited_at: null,
          edit_previous_status: null,
        };

        const fieldMap: Array<{
          label: string;
          column: string;
        }> = [
          {
            label: "Gemstone name",
            column: "name",
          },
          {
            label: "Gem type",
            column: "gem_type",
          },
          {
            label: "Variety",
            column: "variety",
          },
          {
            label: "Origin",
            column: "origin",
          },
          {
            label: "Carat weight",
            column: "carat",
          },
          {
            label: "Asking price",
            column: "price",
          },
          {
            label: "Currency",
            column: "currency",
          },
          {
            label: "Treatment",
            column: "treatment",
          },
          {
            label: "Clarity",
            column: "clarity",
          },
          {
            label: "Cut",
            column: "cut",
          },
          {
            label: "Colour",
            column: "color",
          },
          {
            label: "Dimensions",
            column: "dimensions",
          },
          {
            label: "Description",
            column: "description",
          },
        ];

        for (const field of fieldMap) {
          const savedChange = changes[field.label];

          if (
            savedChange &&
            Object.prototype.hasOwnProperty.call(
              savedChange,
              "before"
            )
          ) {
            restoredValues[field.column] =
              savedChange.before ?? null;
          }
        }

        const { error: restoreError } = await admin
          .from("gems")
          .update(restoredValues)
          .eq("id", id);

        if (restoreError) {
          throw restoreError;
        }
      } else {
        /*
         * This is a completely new gemstone submission,
         * so rejection applies to the whole listing.
         */
        const { error: rejectError } = await admin
          .from("gems")
          .update({
            status: "rejected",
            admin_note: note,
          })
          .eq("id", id);

        if (rejectError) {
          throw rejectError;
        }
      }
    } else {
      return NextResponse.json(
        {
          error:
            "Invalid administrator action or missing note.",
        },
        { status: 400 }
      );
    }

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: `listing_${action}`,
      entity_type: "gem",
      entity_id: id,
      details: {
        note,
        gem_name: gem.name,
        seller_edit_review: isSellerEdit,
        restored_status:
          action === "reject" && isSellerEdit
            ? gem.edit_previous_status
            : null,
      },
    });

    return NextResponse.json({
      ok: true,
      sellerEditReview: isSellerEdit,
    });
  } catch (error) {
    console.error(
      "Administrator listing action failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Admin action failed.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: gem, error: gemError } = await admin
      .from("gems")
      .select("id,name,cover_image_path")
      .eq("id", id)
      .maybeSingle();

    if (gemError) throw gemError;

    if (!gem) {
      return NextResponse.json(
        { error: "Gemstone listing not found." },
        { status: 404 }
      );
    }

    const {
      data: transaction,
      error: transactionError,
    } = await admin
      .from("transactions")
      .select("id")
      .eq("gem_id", id)
      .maybeSingle();

    if (transactionError) throw transactionError;

    if (transaction) {
      return NextResponse.json(
        {
          error:
            "This gemstone has a recorded transaction and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    const [
      { data: media, error: mediaError },
      { data: certificates, error: certificateError },
    ] = await Promise.all([
      admin
        .from("gem_media")
        .select("path")
        .eq("gem_id", id),

      admin
        .from("gem_certificates")
        .select("path")
        .eq("gem_id", id),
    ]);

    if (mediaError) throw mediaError;
    if (certificateError) throw certificateError;

    const mediaPaths = [
      ...new Set(
        [
          gem.cover_image_path,
          ...(media ?? []).map((item) => item.path),
        ].filter(
          (path): path is string =>
            typeof path === "string" &&
            path.length > 0 &&
            !path.startsWith("/") &&
            !path.startsWith("http")
        )
      ),
    ];

    const certificatePaths = [
      ...new Set(
        (certificates ?? [])
          .map((item) => item.path)
          .filter(
            (path): path is string =>
              typeof path === "string" &&
              path.length > 0
          )
      ),
    ];

    const { error: deleteError } = await admin
      .from("gems")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    const cleanupErrors: string[] = [];

    if (mediaPaths.length > 0) {
      const { error } = await admin.storage
        .from("gem-media")
        .remove(mediaPaths);

      if (error) {
        cleanupErrors.push(error.message);
      }
    }

    if (certificatePaths.length > 0) {
      const { error } = await admin.storage
        .from("certificates-private")
        .remove(certificatePaths);

      if (error) {
        cleanupErrors.push(error.message);
      }
    }

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "listing_deleted",
      entity_type: "gem",
      entity_id: id,
      details: {
        gem_name: gem.name,
        storage_cleanup_complete:
          cleanupErrors.length === 0,
        storage_cleanup_errors: cleanupErrors,
      },
    });

    return NextResponse.json({
      ok: true,
      warning:
        cleanupErrors.length > 0
          ? "The listing was deleted, but some stored files may require manual removal."
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete gemstone.",
      },
      { status: 500 }
    );
  }
}