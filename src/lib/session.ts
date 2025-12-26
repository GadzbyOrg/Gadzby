import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ENV } from "@/lib/env";
import { db } from "@/db";
import { users, roles } from "@/db/schema";
import { eq } from "drizzle-orm";

const key = new TextEncoder().encode(ENV.JWT_SECRET);
export const COOKIE_NAME = "tyrion_session";

type SessionPayload = {
	userId: string;
	role: string;
	permissions: string[];
	expiresAt: Date;
};

export async function createSession(
	userId: string,
	role: string,
	permissions: string[],
	redirectTo = "/"
) {
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2);
	const session = await new SignJWT({
		userId,
		role,
		permissions,
		expiresAt,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("2h")
		.sign(key);

	(await cookies()).set(COOKIE_NAME, session, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		expires: expiresAt,
		path: "/",
	});
	redirect(redirectTo);
}

export async function verifySession() {
	const cookie = (await cookies()).get(COOKIE_NAME)?.value;
	if (!cookie) return null;

	try {
		const { payload } = await jwtVerify(cookie, key, { algorithms: ["HS256"] });

		// 1. Validate structure
		if (!payload.userId) return null;

		// 2. DB Check: Ensure user still exists and is not banned/asleep
		const user = await db.query.users.findFirst({
			where: eq(users.id, payload.userId as string),
			columns: { isAsleep: true, isDeleted: true, roleId: true },
		});

		// If user has no role for some reason, set role to USER:
		if (user && !payload.role) {
			const userRole = await db.query.roles.findFirst({
				where: eq(roles.name, "USER"),
			});
			await db
				.update(users)
				.set({
					roleId: userRole?.id,
				})
				.where(eq(users.id, payload.userId as string));
		}

		if (!user || user.isAsleep || user.isDeleted) {
			return null;
		}

		return payload as SessionPayload;
	} catch (error) {
		console.log("Failed to verify session : ", error);
		return null;
	}
}

export async function deleteSession() {
	(await cookies()).delete("session");
	redirect("/login");
}
