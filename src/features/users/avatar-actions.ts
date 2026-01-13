"use server";

import { eq } from "drizzle-orm";
import { existsSync } from "fs";
import { mkdir, unlink,writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";
import { join } from "path";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { verifySession } from "@/lib/session";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const UPLOAD_DIR = join(process.cwd(), "uploads", "avatars");

export async function uploadAvatarAction(formData: FormData) {
	const session = await verifySession();
	if (!session?.userId) {
		return { error: "Unauthorized" };
	}

	const file = formData.get("file") as File;
	if (!file) {
		return { error: "No file uploaded" };
	}

	if (file.size > MAX_FILE_SIZE) {
		return { error: "File size too large (max 5MB)" };
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		return { error: "Invalid file type. Allowed: JPG, PNG, WEBP, GIF" };
	}

	try {
		// Ensure upload directory exists
		if (!existsSync(UPLOAD_DIR)) {
			await mkdir(UPLOAD_DIR, { recursive: true });
		}

        // 1. Get current user to see if they have an old avatar
        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            columns: { image: true },
        });

        if (currentUser?.image) {
            const oldFilePath = join(UPLOAD_DIR, currentUser.image);
            // Check if file exists to avoid error
            if (existsSync(oldFilePath)) {
                try {
                    await unlink(oldFilePath);
                } catch (err) {
                    console.error("Failed to delete old avatar:", err);
                    // Continue even if delete fails
                }
            }
        }

		const buffer = Buffer.from(await file.arrayBuffer());
		const filename = `${session.userId}-${Date.now()}.${file.type.split("/")[1]}`;
		const filepath = join(UPLOAD_DIR, filename);

		await writeFile(filepath, buffer);
        
		await db
			.update(users)
			.set({ image: filename })
			.where(eq(users.id, session.userId));

		revalidatePath("/settings");
        revalidatePath("/", "layout"); 

		return { success: "Avatar updated successfully" };
	} catch (error) {
		console.error("Error uploading avatar:", error);
		return { error: "Failed to upload avatar" };
	}
}
