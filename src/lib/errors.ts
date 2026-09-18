/**
 * Erreur métier : son message est destiné à l'utilisateur final et sera
 * affiché tel quel par les wrappers de server actions.
 *
 * Toute erreur qui n'est PAS une AppError est considérée comme technique :
 * son message est masqué derrière un texte générique et la cause réelle
 * est remontée à Sentry.
 *
 * Ce module n'importe rien volontairement : il est importé par une vingtaine
 * de services et par leurs tests, qui n'ont donc aucun mock à ajouter.
 *
 * Une instance ne traverse jamais la frontière server/client : les wrappers
 * convertissent toujours en `{ error: string }`. Pas besoin de `toJSON`.
 */

export const GENERIC_ERROR_MESSAGE = "Une erreur technique est survenue.";

export type AppErrorOptions = {
	/** Identifiant stable, utile pour brancher côté client sans matcher le message. */
	code?: string;
	/** Statut HTTP pour les routes `src/app/api/**`. 400 par défaut. */
	status?: number;
	cause?: unknown;
};

export class AppError extends Error {
	readonly code: string;
	readonly status: number;

	/**
	 * Marqueur explicite : Next bundle ce module dans plusieurs chunks
	 * (server, edge, route handlers) et le registre de modules de vitest peut
	 * instancier la classe deux fois. `instanceof` renvoie alors `false`, ce
	 * qui recréerait exactement le bug corrigé ici.
	 *
	 * Ne jamais écrire `instanceof AppError` dans src/ : toujours `isAppError()`.
	 */
	readonly isAppError = true as const;

	constructor(message: string, options: AppErrorOptions = {}) {
		super(message, { cause: options.cause });
		this.name = "AppError";
		this.code = options.code ?? "APP_ERROR";
		this.status = options.status ?? 400;
	}
}

export const isAppError = (error: unknown): error is AppError =>
	error instanceof AppError ||
	(typeof error === "object" &&
		error !== null &&
		(error as { isAppError?: unknown }).isAppError === true);

/**
 * Retrouve une AppError encapsulée dans une chaîne de causes : une erreur
 * métier levée dans un `db.transaction(...)` peut remonter enveloppée.
 * Profondeur bornée et résistante aux cycles.
 */
export const findAppError = (error: unknown, maxDepth = 5): AppError | null => {
	let current = error;
	const seen = new Set<unknown>();

	for (let depth = 0; depth <= maxDepth; depth++) {
		if (!current || typeof current !== "object" || seen.has(current)) return null;
		if (isAppError(current)) return current;
		seen.add(current);
		current = (current as { cause?: unknown }).cause;
	}

	return null;
};
