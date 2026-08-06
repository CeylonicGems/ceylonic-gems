import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type NewMediaItem = {
  path: string;
  mediaType: "image" | "video";
  sortOrder: number;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const replaceImages = body.replaceImages === true;
    const replaceVideo = body.replaceVideo === true;
    const replaceCertificate =
      body.replaceCertificate === true;

    const media = Array.isArray(body.media)
      ? (body.media as NewMediaItem[])
      : [];

    const certificatePath =
      typeof body.certificatePath === "string"
        ? body.certificatePath.trim()
        : "";

    const newImages = media.filter(
      (item) =>
        item.mediaType === "image" &&
        typeof item.path === "string" &&
        item.path.length > 0
    );

    const newVideos = media.filter(
      (item) =>
        item.mediaType === "video" &&
        typeof item.path === "string" &&
        item.path.length > 0
    );

    if (replaceImages && newImages.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one new gemstone photograph is required.",
        },
        { status: 400 }
      );
    }

    if (replaceVideo && newVideos.length === 0) {
      return NextResponse.json(
        {
          error: "A new gemstone video is required.",
        },
        { status: 400 }
      );
    }

    if (replaceCertificate && !certificatePath) {
      return NextResponse.json(
        {
          error: "A new certificate file is required.",
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
            "Only seller accounts can replace gemstone media.",
        },
        { status: 403 }
      );
    }

    if (profile.verification_status !== "verified") {
      return NextResponse.json(
        {
          error:
            "Your seller account must be verified.",
        },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: gem, error: gemError } = await admin
      .from("gems")
      .select(
        "id, name, seller_id, status, deletion_requested"
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
            "You cannot replace another seller's gemstone files.",
        },
        { status: 403 }
      );
    }

    if (gem.deletion_requested) {
      return NextResponse.json(
        {
          error:
            "Resolve the pending deletion request before replacing files.",
        },
        { status: 409 }
      );
    }

    if (gem.status === "sold") {
      return NextResponse.json(
        {
          error:
            "Files belonging to a sold gemstone cannot be replaced.",
        },
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
            "This gemstone has a recorded transaction and cannot be edited.",
        },
        { status: 409 }
      );
    }

    const { data: existingMedia, error: mediaError } =
      await admin
        .from("gem_media")
        .select("id, path, media_type")
        .eq("gem_id", id);

    if (mediaError) {
      throw mediaError;
    }

    const {
      data: existingCertificates,
      error: certificateError,
    } = await admin
      .from("gem_certificates")
      .select("id, path")
      .eq("gem_id", id);

    if (certificateError) {
      throw certificateError;
    }

    const oldStoragePaths: string[] = [];

    if (replaceImages) {
      const oldImages = (existingMedia ?? []).filter(
        (item) => item.media_type === "image"
      );

      oldStoragePaths.push(
        ...oldImages.map((item) => item.path)
      );

      const { error: deleteImageRowsError } = await admin
        .from("gem_media")
        .delete()
        .eq("gem_id", id)
        .eq("media_type", "image");

      if (deleteImageRowsError) {
        throw deleteImageRowsError;
      }

      const imageRows = newImages.map((item, index) => ({
        gem_id: id,
        owner_id: user.id,
        path: item.path,
        media_type: "image",
        sort_order: index,
      }));

      const { error: insertImagesError } = await admin
        .from("gem_media")
        .insert(imageRows);

      if (insertImagesError) {
        throw insertImagesError;
      }

      const { error: coverError } = await admin
        .from("gems")
        .update({
          cover_image_path: newImages[0].path,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (coverError) {
        throw coverError;
      }
    }

    if (replaceVideo) {
      const oldVideos = (existingMedia ?? []).filter(
        (item) => item.media_type === "video"
      );

      oldStoragePaths.push(
        ...oldVideos.map((item) => item.path)
      );

      const { error: deleteVideoRowsError } = await admin
        .from("gem_media")
        .delete()
        .eq("gem_id", id)
        .eq("media_type", "video");

      if (deleteVideoRowsError) {
        throw deleteVideoRowsError;
      }

      const video = newVideos[0];

      const { error: insertVideoError } = await admin
        .from("gem_media")
        .insert({
          gem_id: id,
          owner_id: user.id,
          path: video.path,
          media_type: "video",
          sort_order: 100,
        });

      if (insertVideoError) {
        throw insertVideoError;
      }
    }

    if (replaceCertificate) {
      const oldCertificatePaths = (
        existingCertificates ?? []
      ).map((item) => item.path);

      const { error: deleteCertificateRowsError } =
        await admin
          .from("gem_certificates")
          .delete()
          .eq("gem_id", id);

      if (deleteCertificateRowsError) {
        throw deleteCertificateRowsError;
      }

      const { error: insertCertificateError } =
        await admin
          .from("gem_certificates")
          .insert({
            gem_id: id,
            owner_id: user.id,
            path: certificatePath,
            status: "submitted",
          });

      if (insertCertificateError) {
        throw insertCertificateError;
      }

      if (oldCertificatePaths.length > 0) {
        await admin.storage
          .from("certificates-private")
          .remove(oldCertificatePaths);
      }
    }

    if (oldStoragePaths.length > 0) {
      await admin.storage
        .from("gem-media")
        .remove(oldStoragePaths);
    }

    await admin.from("audit_logs").insert({
      actor_id: user.id,
      action: "listing_media_replaced",
      entity_type: "gem",
      entity_id: id,
      details: {
        gem_name: gem.name,
        images_replaced: replaceImages,
        video_replaced: replaceVideo,
        certificate_replaced: replaceCertificate,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Gemstone files replaced successfully.",
    });
  } catch (error) {
    console.error("Media replacement error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to replace gemstone files.",
      },
      { status: 500 }
    );
  }
}