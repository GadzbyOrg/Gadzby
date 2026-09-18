import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	logger: { info: vi.fn(), error: vi.fn() },
	setUser: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";

import { getPostgresErrorCode, toUserMessage } from "../db-errors";
import { AppError, GENERIC_ERROR_MESSAGE } from "../errors";

/** Reproduit l'encapsulation de drizzle : le code est sur `.cause`, pas à la racine. */
const drizzleWrapped = (pg: Record<string, unknown>) =>
	Object.assign(new Error("Failed query: insert into \"users\"..."), { cause: pg });

describe("toUserMessage — erreurs métier", () => {
	beforeEach(() => vi.clearAllMocks());

	test("returns an AppError message verbatim and stays out of Sentry", () => {
		expect(toUserMessage(new AppError("Solde insuffisant"))).toBe("Solde insuffisant");
		expect(Sentry.captureException).not.toHaveBeenCalled();
	});

	test("finds an AppError nested in a cause chain", () => {
		const wrapped = new Error("tx failed", { cause: new AppError("Fam'ss introuvable") });

		expect(toUserMessage(wrapped)).toBe("Fam'ss introuvable");
		expect(Sentry.captureException).not.toHaveBeenCalled();
	});
});

describe("toUserMessage — erreurs Postgres", () => {
	beforeEach(() => vi.clearAllMocks());

	test.each([
		["email", "Key (email)=(a@b.c) already exists.", "Cet email est déjà associé à un autre utilisateur."],
		["phone", "Key (phone)=(0102030405) already exists.", "Ce numéro de téléphone est déjà associé à un autre utilisateur."],
		["username", "Key (username)=(23-151bo225) already exists.", "Ce nom d'utilisateur est déjà pris."],
	])("maps a 23505 on %s", (_field, detail, expected) => {
		expect(toUserMessage(drizzleWrapped({ code: "23505", detail }))).toBe(expected);
	});

	test("falls back to a generic unique message for an unknown column", () => {
		expect(toUserMessage(drizzleWrapped({ code: "23505", detail: "Key (slug)=(x) already exists." })))
			.toBe("Une donnée unique existe déjà pour un autre utilisateur.");
	});

	test.each([
		["23503", "Cet élément est lié à d'autres données et ne peut pas être supprimé ou modifié."],
		["23502", "Un champ obligatoire est manquant."],
		["22P02", "Une valeur transmise est invalide."],
	])("maps %s to an actionable message", (code, expected) => {
		expect(toUserMessage(drizzleWrapped({ code }))).toBe(expected);
	});

	test("detects a Postgres error even when it is not wrapped", () => {
		expect(toUserMessage({ code: "23503" })).toBe(
			"Cet élément est lié à d'autres données et ne peut pas être supprimé ou modifié.",
		);
	});
});

describe("toUserMessage — erreurs techniques", () => {
	beforeEach(() => vi.clearAllMocks());

	// C'est le défaut à l'origine du bug : le message opaque était renvoyé
	// sans qu'aucune exception n'atteigne Sentry.
	test("masks an unknown error AND reports the real cause to Sentry", () => {
		const error = new Error("connect ECONNREFUSED 10.0.0.1:5432");

		expect(toUserMessage(error)).toBe(GENERIC_ERROR_MESSAGE);
		expect(Sentry.captureException).toHaveBeenCalledTimes(1);
		expect(vi.mocked(Sentry.captureException).mock.calls[0][0]).toBe(error);
	});

	test("masks an unmapped Postgres code but keeps it in the Sentry context", () => {
		expect(toUserMessage(drizzleWrapped({ code: "40001" }))).toBe(GENERIC_ERROR_MESSAGE);
		expect(vi.mocked(Sentry.captureException).mock.calls[0][1]).toMatchObject({
			extra: { pgCode: "40001" },
		});
	});
});

describe("getPostgresErrorCode", () => {
	test("reads the code through drizzle's wrapper", () => {
		expect(getPostgresErrorCode(drizzleWrapped({ code: "23505" }))).toBe("23505");
	});

	test("returns null for a non-Postgres error", () => {
		expect(getPostgresErrorCode(new Error("boom"))).toBeNull();
		expect(getPostgresErrorCode({ code: "ENOENT" })).toBeNull();
	});
});
