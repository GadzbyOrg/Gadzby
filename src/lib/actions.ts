import { z } from "zod";

import { toUserMessage } from "@/lib/db-errors";
import { findAppError } from "@/lib/errors";
import { verifySession } from "@/lib/session";

import { logAction } from "./logger";

export type ActionError = {
	error: string;
	fieldErrors?: Record<string, string[]>;
	success?: never;
	data?: never;
};

export type ActionSuccess<T> = {
	success: string;
	data?: T;
	error?: never;
	fieldErrors?: never;
};

export type ActionResult<T> = Promise<ActionError | ActionSuccess<T>>;

type ActionOptions = {
	permissions?: string[];
	requireAdmin?: boolean; // Shortcut for ADMIN_ACCESS or ADMIN role check depending on app logic
	/**
	 * Nom stable de l'action, utilisé pour l'audit et le tag Sentry.
	 * À renseigner systématiquement : la dérivation par stack trace ne
	 * survit pas au build de production (chunks minifiés).
	 */
	name?: string;
};

/** Longueur max d'un message d'erreur écrit dans le log d'audit. */
const MAX_LOGGED_ERROR_LENGTH = 300;

/**
 * Les erreurs de contrôle de flux de Next ne doivent jamais être avalées.
 * `notFound()` et les erreurs HTTP de fallback sont incluses : sans ça, le
 * masquage les transformerait en "Une erreur technique est survenue.".
 */
const isFrameworkControlFlow = (error: unknown): boolean => {
	const digest = (error as { digest?: unknown })?.digest;
	if (typeof digest !== "string") return false;
	return (
		digest.startsWith("NEXT_REDIRECT") ||
		digest === "NEXT_NOT_FOUND" ||
		digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
	);
};

/**
 * Point unique de traitement des exceptions des handlers.
 *
 * - Erreur métier (AppError) -> message affiché tel quel, aucun bruit Sentry.
 * - Erreur technique -> message masqué côté client, cause réelle dans Sentry.
 *
 * Le message brut est conservé dans le log d'audit (tronqué) : seul ce qui
 * est renvoyé au client est masqué.
 */
function handleActionThrow(
	error: any,
	actionName: string,
	userId: string | null,
	payload?: unknown,
): ActionError {
	if (isFrameworkControlFlow(error)) throw error;

	const appError = findAppError(error);
	if (appError) {
		logAction({
			userId,
			actionName,
			payload,
			status: "ERROR",
			errorMessage: appError.message,
		});
		return { error: appError.message };
	}

	console.error(`Action failed (${actionName}):`, error);

	// toUserMessage traduit les erreurs Postgres connues et remonte le reste
	// à Sentry — pas de capture ici, sinon l'incident serait doublonné.
	const message = toUserMessage(error);

	logAction({
		userId,
		actionName,
		payload,
		status: "ERROR",
		errorMessage: String(error?.message ?? error).slice(0, MAX_LOGGED_ERROR_LENGTH),
	});

	return { error: message };
}

/**
 * Wrapper for authenticated server actions.
 * Handles:
 * 1. Session verification
 * 2. Permission checks
 * 3. Zod input validation
 * 4. Error handling
 */
export function authenticatedAction<T extends z.ZodType, R>(
	schema: T,
	handler: (
		data: z.infer<T>,
		context: {
			session: NonNullable<Awaited<ReturnType<typeof verifySession>>>;
		},
	) => Promise<R | { error: string } | { success: string; data?: R }>,
	options: ActionOptions = {},
) {
	const actionName = options.name ?? "UnnamedAction";

	return async (
		prevState: any,
		formData?: FormData | z.infer<T>,
	): Promise<any> => {
		// 1. Verify Session
		const session = await verifySession();
		if (!session) {
			return { error: "Non autorisé (Session invalide)" };
		}

		// 2. Check Permissions
		if (options.requireAdmin) {
			const isAdmin = session.permissions.includes("ADMIN_ACCESS");
			if (!isAdmin) return { error: "Non autorisé (Admin requis)" };
		}

		if (options.permissions && options.permissions.length > 0) {
			const hasPermission = options.permissions.some(
				(p) =>
					session.permissions.includes(p) ||
					session.permissions.includes("ADMIN_ACCESS"),
			);
			if (!hasPermission) {
				return {
					error: `Non autorisé (Permission requise: ${options.permissions.join(
						", ",
					)})`,
				};
			}
		}

		// 3. Parse Input
		let input = formData;
		// Handle direct form action usage where the first argument is FormData
		if (!formData) {
			input = prevState;
		}

		let rawData: any;
		if (input instanceof FormData) {
			rawData = Object.fromEntries(input);

			// Intelligent FormData parsing for arrays
			if (schema instanceof z.ZodObject) {
				const shape = schema.shape;
				for (const key in shape) {
					const fieldSchema = shape[key];
					// Check if field is array (ZodArray or ZodOptional(ZodArray) or ZodDefault(ZodArray))
					let isArray = false;

					if (fieldSchema instanceof z.ZodArray) isArray = true;
					else if (fieldSchema instanceof z.ZodOptional) {
						isArray = fieldSchema._def.innerType instanceof z.ZodArray;
					} else if (fieldSchema instanceof z.ZodDefault) {
						isArray = fieldSchema._def.innerType instanceof z.ZodArray;
					}

					if (isArray) {
						const values = input.getAll(key);
						// Always use getAll for arrays, even if empty (Zod default will handle it if needed)
						// If values exists, use them.
						if (values.length > 0) {
							rawData[key] = values;
						}
					}
				}
			}
		} else {
			rawData = input;
		}

		// Parse with Zod
		const parsed = schema.safeParse(rawData);

		if (!parsed.success) {
			return {
				error: "Données invalides",
				fieldErrors: parsed.error.flatten().fieldErrors,
			};
		}

		// 4. Run Handler
		try {
			const result = await handler(parsed.data, { session });

			const isErrorResult =
				result && typeof result === "object" && "error" in result;
			logAction({
				userId: session.userId,
				actionName,
				payload: parsed.data,
				status: isErrorResult ? "ERROR" : "SUCCESS",
				errorMessage: isErrorResult ? (result as any).error : undefined,
			});

			return result;
		} catch (error: any) {
			return handleActionThrow(error, actionName, session.userId, parsed.data);
		}
	};
}

/**
 * Simple wrapper for actions that don't need input validation (just permission check)
 */
export function authenticatedActionNoInput<R>(
	handler: (context: {
		session: NonNullable<Awaited<ReturnType<typeof verifySession>>>;
	}) => Promise<R>,
	options: ActionOptions = {},
) {
	const actionName = options.name ?? "UnnamedAction";

	return async (): Promise<any> => {
		const session = await verifySession();
		if (!session) return { error: "Non autorisé" };

		if (options.requireAdmin) {
			const isAdmin = session.permissions.includes("ADMIN_ACCESS");
			if (!isAdmin) return { error: "Non autorisé" };
		}

		if (options.permissions) {
			const hasPermission = options.permissions.some(
				(p) =>
					session.permissions.includes(p) ||
					session.permissions.includes("ADMIN_ACCESS"),
			);
			if (!hasPermission) return { error: "Non autorisé" };
		}

		try {
			const result = await handler({ session });

			const isErrorResult =
				result && typeof result === "object" && "error" in result;
			logAction({
				userId: session.userId,
				actionName,
				status: isErrorResult ? "ERROR" : "SUCCESS",
				errorMessage: isErrorResult ? (result as any).error : undefined,
			});

			return result;
		} catch (error: any) {
			return handleActionThrow(error, actionName, session.userId);
		}
	};
}

/**
 * Wrapper for public server actions (no session required).
 */
export function publicAction<T extends z.ZodType, R>(
	schema: T,
	handler: (
		data: z.infer<T>,
	) => Promise<R | { error: string } | { success: string; data?: R }>,
	options: ActionOptions = {},
) {
	const actionName = options.name ?? "UnnamedAction";

	return async (
		prevState: any,
		formData?: FormData | z.infer<T>,
	): Promise<any> => {
		// 1. Parse Input
		let input = formData;
		if (prevState instanceof FormData && !formData) {
			input = prevState;
		}

		let rawData: any;
		if (input instanceof FormData) {
			rawData = Object.fromEntries(input);
			// Intelligent FormData parsing
			if (schema instanceof z.ZodObject) {
				const shape = schema.shape;
				for (const key in shape) {
					const fieldSchema = shape[key];
					let isArray = false;

					if (fieldSchema instanceof z.ZodArray) isArray = true;
					else if (fieldSchema instanceof z.ZodOptional) {
						isArray = fieldSchema._def.innerType instanceof z.ZodArray;
					} else if (fieldSchema instanceof z.ZodDefault) {
						isArray = fieldSchema._def.innerType instanceof z.ZodArray;
					}

					if (isArray) {
						const values = input.getAll(key);
						if (values.length > 0) rawData[key] = values;
					}
				}
			}
		} else {
			rawData = input;
		}

		const parsed = schema.safeParse(rawData);
		if (!parsed.success) {
			return {
				error: "Données invalides",
				fieldErrors: parsed.error.flatten().fieldErrors,
			};
		}

		// 2. Run Handler
		try {
			const result = await handler(parsed.data);

			const isErrorResult =
				result && typeof result === "object" && "error" in result;
			logAction({
				userId: null,
				actionName,
				payload: parsed.data,
				status: isErrorResult ? "ERROR" : "SUCCESS",
				errorMessage: isErrorResult ? (result as any).error : undefined,
			});

			return result;
		} catch (error: any) {
			return handleActionThrow(error, actionName, null, parsed.data);
		}
	};
}

export function publicActionNoInput<R>(
	handler: () => Promise<R>,
	options: ActionOptions = {},
) {
	const actionName = options.name ?? "UnnamedAction";

	return async (): Promise<any> => {
		try {
			const result = await handler();

			const isErrorResult =
				result && typeof result === "object" && "error" in result;
			logAction({
				userId: null,
				actionName,
				status: isErrorResult ? "ERROR" : "SUCCESS",
				errorMessage: isErrorResult ? (result as any).error : undefined,
			});

			return result;
		} catch (error: any) {
			return handleActionThrow(error, actionName, null);
		}
	};
}
