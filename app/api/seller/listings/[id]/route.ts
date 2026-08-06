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

    const name = String(body.name ?? "").trim();
    const gemType = String(body.gemType ?? "").trim();
    const variety = String(body.variety ?? "").trim();
    const origin = String(body.origin ?? "").trim();
    const currency = String(body.currency ?? "LKR")
      .trim()
      .toUpperCase();
    const treatment = String(body.treatment ?? "").trim();
    const clarity = String(body.clarity ?? "").trim();
    const cut = String(body.cut ?? "").trim();
    const color = String(body.color ?? "").trim();
    const dimensions = String(body.dimensions ?? "").trim();
    const description = String(body.description ?? "").trim();
    const editReason = String(body.editReason ?? "").trim();

    const carat = Number(body.carat);
    const price = Number(body.price);

    if (!name) {
      return NextResponse.json(
        { error: "Gemstone name is required." },
        { status: 400 }
      );
    }

    if (!gemType) {
      return NextResponse.json(
        { error: "Gemstone type is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(carat) || carat <= 0) {
      return NextResponse.json(
        { error: "Enter a valid carat weight." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { error: "Enter a valid asking price." },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Gemstone description is required." },
        { status: 400 }
      );
    }

    if (editReason.length < 10) {
      return NextResponse.json(
        {
          error:
            "Please explain why you are editing the gemstone using at least 10 characters.",
        },
        { status: 400 }
      );
    }

    if (editReason.length > 1000) {
      return NextResponse.json(
        {
          error:
            "The edit reason cannot exceed 1,000 characters.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Authentication required. Please sign in again.",
        },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role, verification_status")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (
      !profile ||
      !["seller", "both"].includes(profile.role)
    ) {
      return NextResponse.json(
        {
          error:
            "Only seller accounts can edit gemstone listings.",
        },
        { status: 403 }
      );
    }

    if (profile.verification_status !== "verified") {
      return NextResponse.json(
        {
          error:
            "Your seller account must be verified before editing a gemstone.",
        },
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
        status,
        payment_status,
        deletion_requested
      `)
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
            "You cannot edit another seller's gemstone.",
        },
        { status: 403 }
      );
    }

    if (gem.deletion_requested) {
      return NextResponse.json(
        {
          error:
            "This gemstone has a pending deletion request. Resolve that request before editing.",
        },
        { status: 409 }
      );
    }

    if (gem.status === "sold") {
      return NextResponse.json(
        {
          error: "A sold gemstone cannot be edited.",
        },
        { status: 409 }
      );
    }

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
            "This gemstone has a recorded sale transaction and cannot be edited.",
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const nextStatus =
      gem.payment_status === "paid"
        ? "pending"
        : "payment_pending";

    const { error: updateError } = await admin
      .from("gems")
      .update({
        name,
        gem_type: gemType,
        variety: variety || null,
        origin: origin || null,
        carat,
        price,
        currency,
        treatment: treatment || null,
        clarity: clarity || null,
        cut: cut || null,
        color: color || null,
        dimensions: dimensions || null,
        description,
        seller_edit_reason: editReason,
        seller_edited_at: now,
        edit_previous_status: gem.status,
        status: nextStatus,
        published_at: null,
        admin_note: null,
        updated_at: now,
      })
      .eq("id", id)
      .eq("seller_id", user.id);

    if (updateError) {
      throw updateError;
    }

    const { error: auditError } = await admin
      .from("audit_logs")
      .insert({
        actor_id: user.id,
        action: "listing_edited_by_seller",
        entity_type: "gem",
        entity_id: id,
        details: {
          previous_name: gem.name,
          new_name: name,
          previous_status: gem.status,
          new_status: nextStatus,
          edit_reason: editReason,
        },
      });

    if (auditError) {
      console.error(
        "Gemstone edit audit log failed:",
        auditError
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Gemstone updated and returned to administrator review.",
    });
  } catch (error) {
    console.error("Seller gemstone edit error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update gemstone.",
      },
      { status: 500 }
    );
  }
}