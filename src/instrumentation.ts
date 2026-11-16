import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    // Bloque le démarrage jusqu'à ce que le schéma soit à jour : avec le
    // health check Coolify, la nouvelle version ne reçoit du trafic qu'après.
    // En cas d'échec on démarre quand même (l'interface web n'en dépend pas)
    // et l'erreur remonte dans Sentry.
    try {
      const { runStartupMigrations } = await import("./db/startup-migrations");
      await runStartupMigrations();
    } catch (error) {
      console.error("[startup-migrations] échec", error);
      Sentry.captureException(error);
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
