import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: verification, error } = await admin
      .from("identity_verifications")
      .select("document_front_path,document_back_path,selfie_path")
      .eq("id", id)
      .single();

    if (error || !verification) {
      return NextResponse.json({ error: "Verification record not found." }, { status: 404 });
    }

    const entries = [
      ["Identity front", verification.document_front_path],
      ["Identity back", verification.document_back_path],
      ["Live selfie", verification.selfie_path]
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));

    const files = await Promise.all(
      entries.map(async ([label, path]) => {
        const { data, error: signedError } = await admin.storage
          .from("identity-private")
          .createSignedUrl(path, 300);

        if (signedError || !data?.signedUrl) throw signedError ?? new Error("Signed URL failed.");
        return { label, url: data.signedUrl };
      })
    );

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "identity_files_viewed",
      entity_type: "identity_verification",
      entity_id: id,
      details: { expires_in_seconds: 300 }
    });

    return NextResponse.json({ files, expiresIn: 300 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to open identity files." },
      { status: 500 }
    );
  }
}
