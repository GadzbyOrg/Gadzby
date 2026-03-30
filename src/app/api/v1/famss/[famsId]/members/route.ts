import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { famsMembers, famss } from "@/db/schema";
import { rateLimit, validateApiKey } from "@/lib/api-auth";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ famsId: string }> }
) {
	const authRes = await validateApiKey(req);
	if (!authRes.success) {
		return NextResponse.json({ error: authRes.error }, { status: authRes.status });
	}

	const keyId = authRes.keyRecord!.id;
	const limitRes = await rateLimit(req, keyId, 100, 60000);
	if (!limitRes.success) return NextResponse.json({ error: limitRes.error }, { status: limitRes.status });

	try {
        const { famsId } = await params;

		const fam = await db.query.famss.findFirst({
			where: eq(famss.id, famsId),
			columns: { id: true }
		});

		if (!fam) {
			return NextResponse.json({ error: "Fam'ss introuvable" }, { status: 404 });
		}

		const members = await db.query.famsMembers.findMany({
			where: eq(famsMembers.famsId, famsId),
			with: {
				user: {
					columns: {
						id: true,
						username: true,
						nom: true,
						prenom: true,
						bucque: true,
						promss: true,
					}
				}
			}
		});

		// Map to a cleaner flat array of users
		const formattedMembers = members.map(m => m.user);

		return NextResponse.json({ success: true, members: formattedMembers }, { status: 200 });
	} catch (error) {
		console.error("API Famss Members Error:", error);
		return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
	}
}
