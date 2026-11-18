import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

/**
 * Migrations idempotentes appliquées au démarrage du serveur (via
 * `instrumentation.ts`), pour que chaque instance se mette à jour seule lors
 * d'un déploiement Coolify, sans intervention psql.
 *
 * Le verrou consultatif sérialise les instances qui partagent une même base.
 */
const MIGRATION_LOCK_KEY = 482_017_001;

const RATE_LIMIT_INDEX = "uq_api_rate_limits_ip_or_key";

/**
 * 1.8.0 : index unique requis par l'upsert de `rateLimit` (`ON CONFLICT`).
 * L'ancien code pouvait créer des doublons ; la table ne contient que des
 * compteurs éphémères, on la vide donc avant de créer l'index.
 */
async function ensureRateLimitUniqueIndex(): Promise<boolean> {
	return db.transaction(async (tx) => {
		await tx.execute(sql`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY})`);

		const rows = await tx.execute<{ exists: boolean }>(
			sql`SELECT to_regclass(${`public.${RATE_LIMIT_INDEX}`}) IS NOT NULL AS "exists"`,
		);
		if (rows[0]?.exists) return false;

		await tx.execute(sql`TRUNCATE api_rate_limits`);
		await tx.execute(
			sql.raw(
				`CREATE UNIQUE INDEX IF NOT EXISTS "${RATE_LIMIT_INDEX}" ON "api_rate_limits" USING btree ("ip_or_key")`,
			),
		);
		return true;
	});
}

export async function runStartupMigrations(): Promise<void> {
	const created = await ensureRateLimitUniqueIndex();
	if (created) {
		console.info(`[startup-migrations] index ${RATE_LIMIT_INDEX} créé`);
	}
}
