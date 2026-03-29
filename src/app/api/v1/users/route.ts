import { and, eq, ilike, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { rateLimit, validateApiKey } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) {
		return NextResponse.json({ error: authRes.error }, { status: authRes.status });
	}

	const keyId = authRes.keyRecord!.id;
	const limitRes = await rateLimit(req, keyId, 60, 60000); // 60 requests per minute
	if (!limitRes.success) {
		return NextResponse.json({ error: limitRes.error }, { status: limitRes.status });
	}

	try {
		const searchParams = req.nextUrl.searchParams;
		const name = searchParams.get("name");
		const nums = searchParams.get("nums");
		const promss = searchParams.get("promss");

		const conditions = [eq(users.isDeleted, false), eq(users.isAsleep, false)];

		if (name) {
			conditions.push(
				or(
					ilike(users.nom, `%${name}%`),
					ilike(users.prenom, `%${name}%`),
					ilike(users.username, `%${name}%`),
					ilike(users.bucque, `%${name}%`)
				)!
			);
		}

		if (nums) {
			conditions.push(eq(users.nums, nums));
		}

		if (promss) {
			conditions.push(eq(users.promss, promss));
		}

		// No mandatory parameters anymore, simply respect the limit

		const whereCondition = and(...conditions);

		const result = await db.query.users.findMany({
			where: whereCondition,
			limit: 50,
			// Strict selection to NEVER expose email or passwordHash
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
			},
		});

		return NextResponse.json({ success: true, users: result });
	} catch (error: any) {
		console.error("API User Search Error:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
