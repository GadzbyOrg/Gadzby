import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";

import { ENV } from "@/lib/env";
import { COOKIE_NAME } from "@/lib/session";

const publicRoutes = ["/login"];

export default async function middleware(req: NextRequest) {
	const currentPath = req.nextUrl.pathname;
	const isPublicRoute = publicRoutes.includes(currentPath);
	const session = req.cookies.get(COOKIE_NAME)?.value;


	if (!session && !isPublicRoute) {
		
		return NextResponse.redirect(new URL("/login", req.url));
	}

	if (session) {
		try {
			const secret = new TextEncoder().encode(ENV.JWT_SECRET);
			await jwtVerify(session, secret);

			if (isPublicRoute) {
				console.log("Redirecting to dashboard");
				const payload = await jwtVerify(session, secret);
				const preferredPath = (payload.payload as any).preferredDashboardPath;
				return NextResponse.redirect(new URL(preferredPath || "/", req.url));
			}
		} catch (err) {
			const response = NextResponse.redirect(new URL("/login", req.url));
			response.cookies.delete(COOKIE_NAME);
			return response;
		}
	}
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
