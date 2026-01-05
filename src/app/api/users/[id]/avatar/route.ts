import { verifySession } from "@/lib/session";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const session = await verifySession();
	if (!session) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

    const { id } = await params;

	try {
		const user = await db.query.users.findFirst({
			where: eq(users.id, id),
			columns: {
				image: true,
			},
		});

		if (!user || !user.image) {
			return new NextResponse("Not found", { status: 404 });
		}

		const UPLOAD_DIR = join(process.cwd(), "uploads", "avatars");
		const filepath = join(UPLOAD_DIR, user.image);

		if (!existsSync(filepath)) {
			return new NextResponse("File not found", { status: 404 });
		}

		const fileBuffer = await readFile(filepath);
		const ext = user.image.split(".").pop();
		const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

		return new NextResponse(fileBuffer, {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=3600, must-revalidate",
			},
		});
	} catch (error) {
		console.error("Error serving avatar:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	}
}
