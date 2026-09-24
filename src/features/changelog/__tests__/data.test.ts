import { describe, expect, it } from "vitest";

import packageJson from "../../../../package.json";
import { CHANGELOG, compareVersions } from "../data";

const SEMVER = /^\d+\.\d+\.\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("CHANGELOG", () => {
	it("starts with the current package.json version", () => {
		expect(CHANGELOG[0].version).toBe(packageJson.version);
	});

	it("uses unique semver versions and valid ISO dates", () => {
		const versions = CHANGELOG.map((r) => r.version);
		expect(new Set(versions).size).toBe(versions.length);
		for (const release of CHANGELOG) {
			expect(release.version).toMatch(SEMVER);
			expect(release.date).toMatch(ISO_DATE);
			expect(Number.isNaN(new Date(release.date).getTime())).toBe(false);
		}
	});

	it("is sorted from newest to oldest", () => {
		for (let i = 1; i < CHANGELOG.length; i++) {
			const newer = CHANGELOG[i - 1];
			const older = CHANGELOG[i];
			expect(compareVersions(newer.version, older.version)).toBeGreaterThan(0);
			expect(newer.date >= older.date).toBe(true);
		}
	});

	it("has at least one non-empty change per release", () => {
		for (const release of CHANGELOG) {
			expect(release.changes.length).toBeGreaterThan(0);
			for (const change of release.changes) {
				expect(change.text.trim()).not.toBe("");
			}
		}
	});
});

describe("compareVersions", () => {
	it("compares numerically, not lexically", () => {
		expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
		expect(compareVersions("1.5.4", "1.5.5")).toBeLessThan(0);
		expect(compareVersions("2.0.0", "2.0.0")).toBe(0);
	});
});
