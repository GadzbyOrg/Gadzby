import { describe, expect, it, vi } from "vitest";
import { generateApiKey } from "../api-auth";
import crypto from "crypto";

describe("API Auth Helpers", () => {
	it("should generate a valid API key with prefix", () => {
		const result = generateApiKey();

		// Check rawKey
		expect(result).toHaveProperty("rawKey");
		expect(typeof result.rawKey).toBe("string");
		expect(result.rawKey.startsWith("gadzby_")).toBe(true);

		// length: "gadzby_" is 7 chars + 32 bytes in hex = 64 chars -> total 71
		expect(result.rawKey.length).toBe(71);

		// Check hashedKey
		expect(result).toHaveProperty("hashedKey");
		expect(typeof result.hashedKey).toBe("string");
		expect(result.hashedKey.length).toBe(64); // SHA-256 output length in hex

		// Manually verify hash
		const expectedHash = crypto.createHash("sha256").update(result.rawKey).digest("hex");
		expect(result.hashedKey).toBe(expectedHash);
	});

	it("should generate unique keys on each call", () => {
		const key1 = generateApiKey();
		const key2 = generateApiKey();

		expect(key1.rawKey).not.toBe(key2.rawKey);
		expect(key1.hashedKey).not.toBe(key2.hashedKey);
	});
});
