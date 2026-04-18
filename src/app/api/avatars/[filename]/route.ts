import * as Sentry from "@sentry/nextjs";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { type NextRequest, NextResponse } from "next/server";
import { join, normalize } from "path";

const UPLOAD_DIR = join(process.cwd(), "uploads", "avatars");

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ filename: string }> },
) {
	const { filename } = await params;

	// Basic security to prevent directory traversal
	const normalizedFilename = normalize(filename).replace(/^(\.\.[\/\\])+/, "");
	const filepath = join(UPLOAD_DIR, normalizedFilename);

	if (!filepath.startsWith(UPLOAD_DIR)) {
		return new NextResponse("Forbidden", { status: 403 });
	}

	if (!existsSync(filepath)) {
		return new NextResponse("Not Found", { status: 404 });
	}

	try {
		const fileBuffer = await readFile(filepath);
		const ext = filename.split(".").pop()?.toLowerCase();
		const mimeTypes: Record<string, string> = {
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			webp: "image/webp",
			gif: "image/gif",
		};
		const mimeType = mimeTypes[ext!] || "application/octet-stream";

		return new NextResponse(fileBuffer, {
			headers: {
				"Content-Type": mimeType,
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		});
	} catch (error) {
		Sentry.captureException(error);
		console.error("Error reading avatar file:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
