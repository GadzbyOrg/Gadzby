import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ENV } from "@/lib/env";

const key = new TextEncoder().encode(ENV.JWT_SECRET);
export const COOKIE_NAME = "tyrion_session";

type SessionPayload = {
	userId: string;
	role: string;
	expiresAt: Date;
};

export async function createSession(
	userId: string,
	role: string,
	redirectTo = "/"
) {
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2);
	const session = await new SignJWT({
		userId,
		role,
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
