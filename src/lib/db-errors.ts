
// TODO: maybe expand for login errors. currenly login handler returns db error directly.
// It could also just be handled by the login action directly.
export const handleDbError = (error: unknown): string => {
	console.error("Database operation failed:", error);

	// Helper to find the underlying Postgres error
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const findPostgresError = (err: unknown): any => {
		if (!err || typeof err !== "object") return null;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const errorObj = err as any;
		if (errorObj.code === "23505") return errorObj;
		if (errorObj.cause) return findPostgresError(errorObj.cause);
		return null;
	};

	const pgError = findPostgresError(error);

	if (pgError) {
		if (
			pgError.detail?.includes("email") ||
			pgError.message?.includes("email")
		) {
			return "Cet email est déjà associé à un autre utilisateur.";
		}
		if (
			pgError.detail?.includes("phone") ||
			pgError.message?.includes("phone")
		) {
			return "Ce numéro de téléphone est déjà associé à un autre utilisateur.";
		}
		if (
			pgError.detail?.includes("username") ||
			pgError.message?.includes("username")
		) {
			return "Ce nom d'utilisateur est déjà pris.";
		}
		return "Une donnée unique existe déjà pour un autre utilisateur.";
	}

	// Fallback check on message string if code isn't present
	const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
	if (
		errorMessage &&
		(errorMessage.includes("unique constraint") ||
			errorMessage.includes("duplicate key"))
	) {
		return "Une donnée unique existe déjà pour un autre utilisateur.";
	}

	return "Une erreur technique est survenue.";
};
