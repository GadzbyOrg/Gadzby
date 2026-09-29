import { type NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@/lib/api-auth";
import { requireApiUser } from "@/lib/api-user-auth";
import { getApiUserProfile } from "@/lib/api-user-profile";

export async function GET(req: NextRequest) {
	const auth = await requireApiUser(req);
	if (!auth.success) {
		return NextResponse.json({ error: auth.error }, { status: auth.status });
	}

	const limitRes = await rateLimit(req, auth.keyRecord.id, 100, 60000);
	if (!limitRes.success) {
		return NextResponse.json({ error: limitRes.error }, { status: limitRes.status });
	}

	const user = await getApiUserProfile(auth.userId);
	if (!user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	return NextResponse.json({ success: true, user });
}
