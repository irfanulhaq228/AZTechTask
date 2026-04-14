import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import {
  isCsvLike,
  MAX_UPLOAD_SIZE_BYTES,
  persistUploadFile,
  serializeUpload,
} from "@/lib/uploads";

export const runtime = "nodejs";

export async function GET() {
  const uploads = await prisma.upload.findMany({
    orderBy: {
      uploadedAt: "desc",
    },
    include: {
      insight: true,
    },
  });

  return NextResponse.json({
    uploads: uploads.map(serializeUpload),
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing CSV file." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${Math.round(
            MAX_UPLOAD_SIZE_BYTES / (1024 * 1024),
          )} MB.`,
        },
        { status: 400 },
      );
    }

    if (!isCsvLike(file)) {
      return NextResponse.json({ error: "Only CSV uploads are supported." }, { status: 400 });
    }

    const { storedPath } = await persistUploadFile(file);

    const upload = await prisma.upload.create({
      data: {
        fileName: file.name,
        storedPath,
        status: "PENDING",
      },
      include: {
        insight: true,
      },
    });

    return NextResponse.json(
      {
        upload: serializeUpload(upload),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed.",
      },
      { status: 500 },
    );
  }
}
