import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GemRatingResult = {
  rating: number | string | null;
  vote_total: number | string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in as a buyer." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,verification_status")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      !["buyer", "both"].includes(profile.role) ||
      profile.verification_status !== "verified"
    ) {
      return NextResponse.json(
        { error: "A verified buyer account is required." },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();
    const payload = body as { gemId?: unknown; value?: unknown };
    const gemId = String(payload.gemId ?? "");
    const value = Number(payload.value);

    if (!gemId || ![-1, 0, 1].includes(value)) {
      return NextResponse.json({ error: "Invalid vote." }, { status: 400 });
    }

    const { data: gem } = await supabase
      .from("gems")
      .select("seller_id,status")
      .eq("id", gemId)
      .single();

    if (!gem || gem.status !== "published") {
      return NextResponse.json({ error: "Gemstone unavailable." }, { status: 404 });
    }

    if (gem.seller_id === user.id) {
      return NextResponse.json(
        { error: "Sellers cannot rate their own gemstones." },
        { status: 403 }
      );
    }

    if (value === 0) {
      const { error: deleteError } = await supabase
        .from("gem_votes")
        .delete()
        .eq("gem_id", gemId)
        .eq("buyer_id", user.id);

      if (deleteError) throw deleteError;
    } else {
      const { error: voteError } = await supabase.from("gem_votes").upsert(
        {
          gem_id: gemId,
          buyer_id: user.id,
          vote: value
        },
        { onConflict: "gem_id,buyer_id" }
      );

      if (voteError) throw voteError;
    }

    const { data: rawRating, error: ratingError } = await supabase
      .rpc("get_gem_rating", { target_gem: gemId })
      .single();

    if (ratingError) throw ratingError;

    const ratingResult = rawRating as GemRatingResult | null;
    if (!ratingResult) {
      throw new Error("Rating calculation returned no result.");
    }

    return NextResponse.json({
      rating:
        ratingResult.rating === null ? null : Number(ratingResult.rating),
      voteTotal: Number(ratingResult.vote_total ?? 0)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rating failed." },
      { status: 500 }
    );
  }
}
