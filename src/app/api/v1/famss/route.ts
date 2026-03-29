import { type NextRequest, NextResponse } from "next/server";
import { ilike } from "drizzle-orm";

import { db } from "@/db";
import { famss } from "@/db/schema/famss";
import { rateLimit, validateApiKey } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) {
		return NextResponse.json({ error: authRes.error }, { status: authRes.status });
	}

	const keyId = authRes.keyRecord!.id;
	const limitRes = await rateLimit(req, keyId, 100, 60000);
	if (!limitRes.success) {
		return NextResponse.json({ error: limitRes.error }, { status: limitRes.status });
	}

	const { searchParams } = new URL(req.url);
	const nameStr = searchParams.get("name");
	const limitStr = searchParams.get("limit");
	const offsetStr = searchParams.get("offset");

	const limit = limitStr ? parseInt(limitStr, 10) : 50;
	const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

	if (isNaN(limit) || limit <= 0 || limit > 100) {
		return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
	}
	if (isNaN(offset) || offset < 0) {
		return NextResponse.json({ error: "Invalid offset" }, { status: 400 });
	}

	try {
		const conditions: any[] = [];
		if (nameStr) {
			conditions.push(ilike(famss.name, `%${nameStr}%`));
		}

		const data = await db.query.famss.findMany({
			where: (f, { and }) => and(...conditions),
			limit,
			offset,
			columns: { id: true, name: true }, // explicitly not exposing balance 
		});

		return NextResponse.json({ success: true, limit, offset, famss: data }, { status: 200 });
	} catch (error) {
		console.error("API Famss List Error:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
