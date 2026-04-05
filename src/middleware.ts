import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "tyrion_session";

const publicRoutes = ["/login", "/forgot-password", "/reset-password"];

export default async function middleware(req: NextRequest) {
	const currentPath = req.nextUrl.pathname;
	const isPublicRoute = publicRoutes.includes(currentPath);
	const session = req.cookies.get(COOKIE_NAME)?.value;

	if (!session && !isPublicRoute) {
		return NextResponse.redirect(new URL("/login", req.url));
	}

	if (session) {
		try {
			const secret = new TextEncoder().encode(process.env.JWT_SECRET);
			await jwtVerify(session, secret);

			if (isPublicRoute) {
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
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.ico).*)"],
};
