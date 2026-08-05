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
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    const body = await request.json();
    const status = String(body.status ?? "");
    const allowed = ["approved", "rescheduled", "cancelled", "completed"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid appointment status." }, { status: 400 });
    }

    const admin = createAdminClient();
    const update: Record<string, string> = {
      status,
      assigned_admin: user.id
    };

    if (body.preferredAt) {
      const date = new Date(body.preferredAt);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid appointment date." }, { status: 400 });
      }
      update.preferred_at = date.toISOString();
    }

    const { error } = await admin.from("appointments").update(update).eq("id", id);
    if (error) throw error;

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: `appointment_${status}`,
      entity_type: "appointment",
      entity_id: id,
      details: body.preferredAt ? { preferred_at: update.preferred_at } : {}
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Appointment action failed." },
      { status: 500 }
    );
  }
}
