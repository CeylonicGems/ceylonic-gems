import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const action = String(body.action ?? "");
    const adminNote = String(body.adminNote ?? "").trim();

    if (
      action !== "approve_delete" &&
      action !== "reject_request"
    ) {
      return NextResponse.json(
        { error: "Invalid deletion-review action." },
        { status: 400 }
      );
    }

    if (
      action === "reject_request" &&
      adminNote.length < 5
    ) {
      return NextResponse.json(
        {
          error:
            "Please provide a reason for rejecting the request.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: gem, error: gemError } = await admin
      .from("gems")
      .select(`
        id,
        name,
        seller_id,
        cover_image_path,
        deletion_requested,
        deletion_reason,
        deletion_previous_status
      `)
      .eq("id", id)
      .maybeSingle();

    if (gemError) {
      throw gemError;
    }

    if (!gem) {
      return NextResponse.json(
        { error: "Gemstone not found." },
        { status: 404 }
      );
    }

    if (!gem.deletion_requested) {
      return NextResponse.json(
        {
          error:
            "This gemstone does not have a pending deletion request.",
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    /*
     * Reject the deletion request.
     * The gemstone becomes visible again because
     * deletion_requested changes back to false.
     */
    if (action === "reject_request") {
      const { error: rejectError } = await admin
        .from("gems")
        .update({
          deletion_requested: false,
          deletion_reviewed_at: now,
          deletion_reviewed_by: user.id,
          deletion_admin_note: adminNote,
          updated_at: now,
        })
        .eq("id", id);

      if (rejectError) {
        throw rejectError;
      }

      await admin.from("audit_logs").insert({
        actor_id: user.id,
        action: "listing_deletion_rejected",
        entity_type: "gem",
        entity_id: id,
        details: {
          gem_name: gem.name,
          seller_reason: gem.deletion_reason,
          admin_note: adminNote,
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Deletion request rejected.",
      });
    }

    /*
     * Do not delete gemstones that already have
     * a recorded sale transaction.
     */
    const {
      data: transaction,
      error: transactionError,
    } = await admin
      .from("transactions")
      .select("id")
      .eq("gem_id", id)
      .limit(1)
      .maybeSingle();

    if (transactionError) {
      throw transactionError;
    }

    if (transaction) {
      return NextResponse.json(
        {
          error:
            "This gemstone has a recorded sale transaction and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    /*
     * Read uploaded file paths before deleting
     * the gemstone database records.
     */
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

    if (mediaError) {
      throw mediaError;
    }

    if (certificateError) {
      throw certificateError;
    }

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

    /*
     * Delete related database records.
     */
    const deletionResults = await Promise.all([
      admin.from("offers").delete().eq("gem_id", id),
      admin.from("gem_votes").delete().eq("gem_id", id),
      admin.from("appointments").delete().eq("gem_id", id),
      admin.from("gem_media").delete().eq("gem_id", id),
      admin
        .from("gem_certificates")
        .delete()
        .eq("gem_id", id),
    ]);

    const relatedDeleteError = deletionResults.find(
      (result) => result.error
    )?.error;

    if (relatedDeleteError) {
      throw relatedDeleteError;
    }

    /*
     * Permanently delete the gemstone.
     */
    const { error: deleteError } = await admin
      .from("gems")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    /*
     * Remove files from Supabase Storage.
     */
    const storageWarnings: string[] = [];

    if (mediaPaths.length > 0) {
      const { error } = await admin.storage
        .from("gem-media")
        .remove(mediaPaths);

      if (error) {
        storageWarnings.push(error.message);
      }
    }

    if (certificatePaths.length > 0) {
      const { error } = await admin.storage
        .from("certificates-private")
        .remove(certificatePaths);

      if (error) {
        storageWarnings.push(error.message);
      }
    }

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "listing_deletion_approved",
      entity_type: "gem",
      entity_id: id,
      details: {
        gem_name: gem.name,
        seller_reason: gem.deletion_reason,
        storage_warnings: storageWarnings,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Gemstone permanently deleted.",
      warning:
        storageWarnings.length > 0
          ? "The listing was deleted, but some stored files may require manual removal."
          : null,
    });
  } catch (error) {
    console.error("Admin deletion review error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to review deletion request.",
      },
      { status: 500 }
    );
  }
}