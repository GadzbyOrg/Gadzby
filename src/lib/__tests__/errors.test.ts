import { describe, expect, test } from "vitest";

import { AppError, findAppError, isAppError } from "../errors";

describe("AppError", () => {
	test("exposes sensible defaults", () => {
		const error = new AppError("Solde insuffisant");

		expect(error.message).toBe("Solde insuffisant");
		expect(error.code).toBe("APP_ERROR");
		expect(error.status).toBe(400);
		expect(error.name).toBe("AppError");
		expect(error).toBeInstanceOf(Error);
	});

	test("accepts an explicit status and code", () => {
		const error = new AppError("Non autorisé", { status: 403, code: "FORBIDDEN" });

		expect(error.status).toBe(403);
		expect(error.code).toBe("FORBIDDEN");
	});
});

describe("isAppError", () => {
	test("recognises a real instance", () => {
		expect(isAppError(new AppError("boom"))).toBe(true);
	});

	test("recognises a lookalike coming from another module copy", () => {
		// Next bundle ce module dans plusieurs chunks : `instanceof` peut
		// échouer alors que l'objet est bien une AppError.
		expect(isAppError({ isAppError: true, message: "boom" })).toBe(true);
	});

	test("rejects a plain Error and non-objects", () => {
		expect(isAppError(new Error("boom"))).toBe(false);
		expect(isAppError("boom")).toBe(false);
		expect(isAppError(null)).toBe(false);
	});
});

describe("findAppError", () => {
	test("finds an AppError wrapped in a cause chain", () => {
		const wrapped = new Error("query failed", {
			cause: new Error("tx rolled back", { cause: new AppError("Solde insuffisant") }),
		});

		expect(findAppError(wrapped)?.message).toBe("Solde insuffisant");
	});

	test("returns null when the chain holds no AppError", () => {
		expect(findAppError(new Error("a", { cause: new Error("b") }))).toBeNull();
	});

	test("survives a cyclic cause chain", () => {
		const a: any = new Error("a");
		const b: any = new Error("b", { cause: a });
		a.cause = b;

		expect(findAppError(a)).toBeNull();
	});
});
