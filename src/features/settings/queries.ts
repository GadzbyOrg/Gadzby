import { eq } from "drizzle-orm";

import { db } from "@/db";
import { systemSettings } from "@/db/schema/settings";

/**
 * Public query to get the campus name from system settings.
 * Falls back to the CAMPUS_NAME environment variable.
 * Does NOT require authentication — safe for use on the login page.
 */
export async function getCampusName(): Promise<string> {
	try {
		const setting = await db.query.systemSettings.findFirst({
			where: eq(systemSettings.key, "campus_name"),
		});

		const value = setting?.value as { name: string } | null;
		return value?.name ?? process.env.CAMPUS_NAME ?? "";
	} catch (error) {
		console.error("Failed to fetch campus name:", error);
		return process.env.CAMPUS_NAME ?? "";
	}
}

/**
 * Public query to get the login page MOTD from system settings.
 * Does NOT require authentication — safe for use on the login page.
 * Returns null if no MOTD has been configured.
 */
export async function getLoginMotd(): Promise<string | null> {
	try {
		const setting = await db.query.systemSettings.findFirst({
			where: eq(systemSettings.key, "login_motd"),
		});

		const value = setting?.value as { text: string } | null;
		return value?.text ?? null;
	} catch (error) {
		console.error("Failed to fetch login MOTD:", error);
		return null;
	}
}
