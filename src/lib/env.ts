import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: ".env.local" });

const envSchema = z.object({
	DATABASE_URL: z.url(),
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	JWT_SECRET: z.string(),
	CAMPUS_NAME: z.string(),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
	console.error("Variables d'environment invalides : ", env.error);
	throw new Error("Variables d'environement invalides");
}

export const ENV = env.data;
