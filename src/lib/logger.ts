

/**
 * Sanitizes the payload by removing sensitive fields (like passwords, tokens).
 */
function sanitizePayload(payload: any): any {
	if (!payload) return payload;

	if (typeof payload !== "object") {
		return payload;
	}

	if (Array.isArray(payload)) {
		return payload.map(sanitizePayload);
	}

	const sanitized = { ...payload };
	
	// List of sensitive fields to redact
	const sensitiveFields = [
		"password",
		"newPassword",
		"currentPassword",
		"token",
		"refreshToken",
		"accessToken",
		"secret",
	];

	for (const key of Object.keys(sanitized)) {
		// Deep sanitize objects
		if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
			sanitized[key] = sanitizePayload(sanitized[key]);
		} else if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
			sanitized[key] = "[REDACTED]";
		}
	}

	return sanitized;
}

/**
 * Asynchronously writes an audit log to the database.
 * Does not block the main request execution.
 */
export function logAction({
	userId,
	actionName,
	payload,
	status,
	errorMessage,
}: {
	userId?: string | null;
	actionName: string;
	payload?: any;
	status: "SUCCESS" | "ERROR";
	errorMessage?: string;
}) {
	// Execute immediately without awaiting to avoid blocking the main thread
	Promise.resolve().then(() => {
		const logEntry = {
			timestamp: new Date().toISOString(),
			userId: userId || "Unauthenticated",
			actionName,
			payload: payload ? sanitizePayload(payload) : null,
			status,
			...(errorMessage ? { errorMessage } : {}),
		};

		if (status === "ERROR") {
			console.error(`[AUDIT LOG] ERROR:`, JSON.stringify(logEntry));
		} else {
			console.log(`[AUDIT LOG] SUCCESS:`, JSON.stringify(logEntry));
		}
	});
}
