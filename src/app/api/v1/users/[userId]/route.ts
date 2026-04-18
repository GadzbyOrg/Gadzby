import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { rateLimit, validateApiKey } from "@/lib/api-auth";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ userId: string }> }
) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) {
		return NextResponse.json({ error: authRes.error }, { status: authRes.status });
	}

	const keyId = authRes.keyRecord!.id;
	const limitRes = await rateLimit(req, keyId, 100, 60000);
	if (!limitRes.success) {
		return NextResponse.json({ error: limitRes.error }, { status: limitRes.status });
	}

	try {
		const { userId } = await params;

		const user = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: {
				id: true,
				nom: true,
				prenom: true,
				username: true,
				bucque: true,
				nums: true,
				promss: true,
				tabagnss: true,
				image: true,
				isAsleep: true,
				isDeleted: true,
			},
		});

		if (!user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		if (user.isDeleted) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		return NextResponse.json({ success: true, user });
	} catch (error: any) {
		console.error("API User Get Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
