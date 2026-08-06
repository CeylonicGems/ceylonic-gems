import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ChangeValue = string | number | null;

type FieldChange = {
  before: ChangeValue;
  after: ChangeValue;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const gemType = String(body.gemType ?? "").trim();

    const variety =
      String(body.variety ?? "").trim() || null;

    const origin =
      String(body.origin ?? "").trim() || null;

    const treatment =
      String(body.treatment ?? "").trim() || null;

    const clarity =
      String(body.clarity ?? "").trim() || null;

    const cut =
      String(body.cut ?? "").trim() || null;

    const color =
      String(body.color ?? "").trim() || null;

    const dimensions =
      String(body.dimensions ?? "").trim() || null;

    const description = String(
      body.description ?? ""
    ).trim();

    const currency = String(
      body.currency ?? "LKR"
    )
      .trim()
      .toUpperCase();

    const editReason = String(
      body.editReason ?? ""
    ).trim();

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,verification_status")
      .eq("id", user.id)
      .maybeSingle();

    if (
      !profile ||
      !["seller", "both"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "Seller account required." },
        { status: 403 }
      );
    }

    if (profile.verification_status !== "verified") {
      return NextResponse.json(
        { error: "Seller verification is required." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: gem, error: gemError } = await admin
      .from("gems")
      .select(`
        id,
        seller_id,
        status,
        payment_status,
        deletion_requested,
        name,
        gem_type,
        variety,
        origin,
        carat,
        price,
        currency,
        treatment,
        clarity,
        cut,
        color,
        dimensions,
        description
      `)
      .eq("id", id)
      .maybeSingle();

    if (gemError) throw gemError;

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
            "Resolve the deletion request before editing.",
        },
        { status: 409 }
      );
    }

    if (gem.status === "sold") {
      return NextResponse.json(
        { error: "A sold gemstone cannot be edited." },
        { status: 409 }
      );
    }

    const { data: transaction } = await admin
      .from("transactions")
      .select("id")
      .eq("gem_id", id)
      .limit(1)
      .maybeSingle();

    if (transaction) {
      return NextResponse.json(
        {
          error:
            "A gemstone with a sale transaction cannot be edited.",
        },
        { status: 409 }
      );
    }

    const changes: Record<string, FieldChange> = {};

    function recordChange(
      field: string,
      before: ChangeValue,
      after: ChangeValue
    ) {
      if (before !== after) {
        changes[field] = { before, after };
      }
    }

    recordChange("Gemstone name", gem.name, name);
    recordChange("Gem type", gem.gem_type, gemType);
    recordChange("Variety", gem.variety, variety);
    recordChange("Origin", gem.origin, origin);
    recordChange("Carat weight", Number(gem.carat), carat);
    recordChange("Asking price", Number(gem.price), price);
    recordChange("Currency", gem.currency, currency);
    recordChange("Treatment", gem.treatment, treatment);
    recordChange("Clarity", gem.clarity, clarity);
    recordChange("Cut", gem.cut, cut);
    recordChange("Colour", gem.color, color);
    recordChange("Dimensions", gem.dimensions, dimensions);
    recordChange(
      "Description",
      gem.description,
      description
    );

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
        variety,
        origin,
        carat,
        price,
        currency,
        treatment,
        clarity,
        cut,
        color,
        dimensions,
        description,
        seller_edit_reason: editReason,
        seller_edit_changes: changes,
        seller_edited_at: now,
        edit_previous_status: gem.status,
        status: nextStatus,
        published_at: null,
        admin_note: null,
        updated_at: now,
      })
      .eq("id", id)
      .eq("seller_id", user.id);

    if (updateError) throw updateError;

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "listing_edited_by_seller",
      entity_type: "gem",
      entity_id: id,
      details: {
        edit_reason: editReason,
        changed_fields: changes,
        previous_status: gem.status,
        new_status: nextStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      changes,
      message:
        "Gemstone updated and returned for administrator review.",
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