import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const reason = String(body.reason ?? "").trim();

    if (reason.length < 10) {
      return NextResponse.json(
        {
          error:
            "Please provide a clear deletion reason containing at least 10 characters.",
        },
        { status: 400 }
      );
    }

    if (reason.length > 1000) {
      return NextResponse.json(
        {
          error:
            "The deletion reason cannot exceed 1,000 characters.",
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

    if (
      profile?.role !== "seller" &&
      profile?.role !== "both"
    ) {
      return NextResponse.json(
        {
          error:
            "Only seller accounts can request listing deletion.",
        },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: gem, error: gemError } = await admin
      .from("gems")
      .select(
        "id,name,seller_id,status,deletion_requested"
      )
      .eq("id", id)
      .maybeSingle();

    if (gemError) {
      throw gemError;
    }

    if (!gem) {
      return NextResponse.json(
        { error: "Gemstone listing not found." },
        { status: 404 }
      );
    }

    if (gem.seller_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "You cannot request deletion of another seller’s gemstone.",
        },
        { status: 403 }
      );
    }

    if (gem.deletion_requested) {
      return NextResponse.json(
        {
          error:
            "A deletion request has already been submitted for this gemstone.",
        },
        { status: 409 }
      );
    }

    const { data: transaction, error: transactionError } =
      await admin
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

    const now = new Date().toISOString();

    const { error: updateError } = await admin
      .from("gems")
      .update({
        deletion_requested: true,
        deletion_reason: reason,
        deletion_requested_at: now,
        deletion_requested_by: user.id,
        deletion_previous_status: gem.status,
        deletion_reviewed_at: null,
        deletion_reviewed_by: null,
        deletion_admin_note: null,
        updated_at: now,
      })
      .eq("id", id)
      .eq("seller_id", user.id);

    if (updateError) {
      throw updateError;
    }

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "listing_deletion_requested",
      entity_type: "gem",
      entity_id: id,
      details: {
        gem_name: gem.name,
        reason,
        previous_status: gem.status,
      },
    });

    return NextResponse.json({
      ok: true,
      message:
        "Deletion request submitted for administrator review.",
    });
  } catch (error) {
    console.error("Deletion request error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit deletion request.",
      },
      { status: 500 }
    );
  }
}