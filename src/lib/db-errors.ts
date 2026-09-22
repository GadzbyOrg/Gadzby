import * as Sentry from "@sentry/nextjs";

import { findAppError, GENERIC_ERROR_MESSAGE } from "./errors";

type PostgresError = {
	code: string;
	detail?: string;
	message?: string;
	constraint?: string;
	column?: string;
};

/**
 * Remonte la chaîne des causes pour retrouver l'erreur Postgres sous-jacente.
 * Drizzle encapsule les erreurs du driver dans un DrizzleQueryError, donc le
 * code n'est jamais présent sur l'erreur de premier niveau.
 */
const findPostgresError = (error: unknown): PostgresError | null => {
	if (!error || typeof error !== "object") return null;

	const errorObj = error as { code?: unknown; cause?: unknown };
	// SQLSTATE : 5 caractères alphanumériques (ex. 23505, mais aussi 22P02).
	if (typeof errorObj.code === "string" && /^[0-9A-Z]{5}$/.test(errorObj.code)) {
		return errorObj as PostgresError;
	}
	if (errorObj.cause) return findPostgresError(errorObj.cause);
	return null;
};

/** Identifie la colonne concernée à partir du detail/constraint Postgres. */
const matchField = (pgError: PostgresError, field: string): boolean => {
	const haystack = `${pgError.detail ?? ""} ${pgError.constraint ?? ""} ${pgError.column ?? ""} ${pgError.message ?? ""}`;
	return haystack.includes(field);
};

const translateUniqueViolation = (pgError: PostgresError): string => {
	if (matchField(pgError, "email")) {
		return "Cet email est déjà associé à un autre utilisateur.";
	}
	if (matchField(pgError, "phone")) {
		return "Ce numéro de téléphone est déjà associé à un autre utilisateur.";
	}
	if (matchField(pgError, "username")) {
		return "Ce nom d'utilisateur est déjà pris.";
	}
	return "Une donnée unique existe déjà pour un autre utilisateur.";
};

const translatePostgresError = (pgError: PostgresError): string | null => {
	switch (pgError.code) {
		case "23505": // unique_violation
			return translateUniqueViolation(pgError);
		case "23503": // foreign_key_violation
			return "Cet élément est lié à d'autres données et ne peut pas être supprimé ou modifié.";
		case "23502": // not_null_violation
			return "Un champ obligatoire est manquant.";
		case "22P02": // invalid_text_representation (enum / uuid invalide)
			return "Une valeur transmise est invalide.";
		default:
			return null;
	}
};

/**
 * Code SQLSTATE de l'erreur Postgres sous-jacente, `null` si ce n'en est pas une.
 * Passe par `findPostgresError` : lire `error.code` directement échoue avec
 * drizzle, qui encapsule l'erreur du driver.
 */
export const getPostgresErrorCode = (error: unknown): string | null =>
	findPostgresError(error)?.code ?? null;

/**
 * Traduit une erreur en message affichable par l'utilisateur.
 *
 * 1. AppError  -> message métier retourné tel quel (aucun bruit Sentry).
 * 2. Erreur Postgres connue -> message français explicite.
 * 3. Reste -> message générique, cause réelle remontée à Sentry.
 */
export const toUserMessage = (error: unknown): string => {
	const appError = findAppError(error);
	if (appError) {
		return appError.message;
	}

	const pgError = findPostgresError(error);
	if (pgError) {
		const translated = translatePostgresError(pgError);
		if (translated) return translated;
	}

	// Fallback: on ne sait pas traduire, donc on masque côté UI mais on
	// remonte l'erreur complète (une exception, pas un simple log console).
	Sentry.captureException(error, {
		tags: { handler: "toUserMessage" },
		extra: pgError ? { pgCode: pgError.code, pgDetail: pgError.detail } : undefined,
	});

	return GENERIC_ERROR_MESSAGE;
};

/** @deprecated Utiliser `toUserMessage`. Conservé le temps de la migration. */
export const handleDbError = toUserMessage;
