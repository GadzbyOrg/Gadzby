import { verifySession } from "@/lib/session";
import { redirect } from "next/navigation";
import { z } from "zod";

export type ActionError = {
    error: string;
    fieldErrors?: Record<string, string[]>;
    success?: never;
    data?: never;
}

export type ActionSuccess<T> = {
    success: string;
    data?: T;
    error?: never;
    fieldErrors?: never;
}

export type ActionResult<T> = Promise<ActionError | ActionSuccess<T>>;

type ActionOptions = {
    permissions?: string[];
    requireAdmin?: boolean; // Shortcut for ADMIN_ACCESS or ADMIN role check depending on app logic
};

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
    handler: (data: z.infer<T>, context: { session: NonNullable<Awaited<ReturnType<typeof verifySession>>> }) => Promise<R | { error: string } | { success: string, data?: R }>,
    options: ActionOptions = {}
) {
    return async (prevState: any, formData?: FormData | z.infer<T>): Promise<any> => {
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
            const hasPermission = options.permissions.some(p => 
                session.permissions.includes(p) || 
                session.permissions.includes("ADMIN_ACCESS")
            );
            if (!hasPermission) {
                return { error: `Non autorisé (Permission requise: ${options.permissions.join(", ")})` };
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
        // We might need pre-processing for FormData (numbers, booleans)
        // Usually safeParse is enough if using z.coerce or string inputs
        console.log(formData);
        const parsed = schema.safeParse(rawData);

        if (!parsed.success) {
            return { 
                error: "Données invalides", 
                fieldErrors: parsed.error.flatten().fieldErrors 
            };
        }

        // 4. Run Handler
        try {
            return await handler(parsed.data, { session });
        } catch (error: any) {
            if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
                throw error;
            }
            console.error("Action failed:", error);
            // Return safe error
            return { error: error.message || "Une erreur est survenue" };
        }
    };
}


/**
 * Simple wrapper for actions that don't need input validation (just permission check)
 */
export function authenticatedActionNoInput<R>(
    handler: (context: { session: NonNullable<Awaited<ReturnType<typeof verifySession>>> }) => Promise<R>,
    options: ActionOptions = {}
) {
    return async (): Promise<any> => {
        const session = await verifySession();
        if (!session) return { error: "Non autorisé" };

        if (options.requireAdmin) {
             const isAdmin = session.permissions.includes("ADMIN_ACCESS");
             if (!isAdmin) return { error: "Non autorisé" };
        }

        if (options.permissions) {
             const hasPermission = options.permissions.some(p => 
                session.permissions.includes(p) ||
                session.permissions.includes("ADMIN_ACCESS")
            );
            if (!hasPermission) return { error: "Non autorisé" };
        }

        try {
            return await handler({ session });
        } catch (error: any) {
            if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
                throw error;
            }
            console.error("Action failed:", error);
            return { error: error.message || "Erreur serveur" };
        }
    }
}

/**
 * Wrapper for public server actions (no session required).
 */
export function publicAction<T extends z.ZodType, R>(
    schema: T,
    handler: (data: z.infer<T>) => Promise<R | { error: string } | { success: string, data?: R }>
) {
    return async (prevState: any, formData?: FormData | z.infer<T>): Promise<any> => {
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
                fieldErrors: parsed.error.flatten().fieldErrors 
            };
        }

        // 2. Run Handler
        try {
            return await handler(parsed.data);
        } catch (error: any) {
             if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
                throw error;
            }
            console.error("Public action failed:", error);
            return { error: error.message || "Une erreur est survenue" };
        }
    };
}

export function publicActionNoInput<R>(
    handler: () => Promise<R>
) {
    return async (): Promise<any> => {
        try {
            return await handler();
        } catch (error: any) {
             if (error.message === 'NEXT_REDIRECT' || error.digest?.startsWith('NEXT_REDIRECT')) {
                throw error;
            }
            console.error("Public action failed:", error);
            return { error: error.message || "Erreur serveur" };
        }
    }
}
