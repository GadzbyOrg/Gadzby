import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const execute = vi.fn();

vi.mock("@/db", () => ({
	db: {
		transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ execute })),
	},
}));

import { runStartupMigrations } from "../startup-migrations";

const dialect = new PgDialect();
const executedSql = () => execute.mock.calls.map(([query]) => dialect.sqlToQuery(query as SQL).sql);

describe("runStartupMigrations", () => {
	beforeEach(() => {
		execute.mockReset();
		vi.spyOn(console, "info").mockImplementation(() => {});
	});

	test("creates the rate-limit unique index after clearing duplicates when missing", async () => {
		// Arrange
		execute.mockImplementation(async (query: SQL) =>
			dialect.sqlToQuery(query).sql.includes("to_regclass") ? [{ exists: false }] : [],
		);

		// Act
		await runStartupMigrations();

		// Assert
		const statements = executedSql();
		expect(statements[0]).toContain("pg_advisory_xact_lock");
		expect(statements[2]).toBe("TRUNCATE api_rate_limits");
		expect(statements[3]).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "uq_api_rate_limits_ip_or_key"');
	});

	test("does nothing (no truncate) when the index already exists", async () => {
		// Arrange
		execute.mockImplementation(async (query: SQL) =>
			dialect.sqlToQuery(query).sql.includes("to_regclass") ? [{ exists: true }] : [],
		);

		// Act
		await runStartupMigrations();

		// Assert
		const statements = executedSql();
		expect(statements).toHaveLength(2);
		expect(statements.some((s) => s.includes("TRUNCATE"))).toBe(false);
	});

	test("propagates database errors to the caller", async () => {
		// Arrange
		execute.mockRejectedValue(new Error("connection refused"));

		// Act + Assert
		await expect(runStartupMigrations()).rejects.toThrow("connection refused");
	});
});
