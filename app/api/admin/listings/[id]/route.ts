import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const note = String(body.note ?? "").slice(0, 1500);

    const admin = createAdminClient();

    const { data: gem } = await admin
      .from("gems")
      .select("payment_status,name")
      .eq("id", id)
      .single();

    if (!gem) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }

    if (action === "approve") {
      if (gem.payment_status !== "paid") {
        return NextResponse.json(
          { error: "The listing fee has not been paid." },
          { status: 409 }
        );
      }

      await admin
        .from("gems")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          admin_note: null,
        })
        .eq("id", id);
    } else if (
      action === "changes_requested" &&
      note
    ) {
      await admin
        .from("gems")
        .update({
          status: "changes_requested",
          admin_note: note,
        })
        .eq("id", id);
    } else if (action === "reject" && note) {
      await admin
        .from("gems")
        .update({
          status: "rejected",
          admin_note: note,
        })
        .eq("id", id);
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
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
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