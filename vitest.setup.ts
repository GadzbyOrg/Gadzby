import { vi } from "vitest";

// Mock environment variables required by src/lib/env.ts
vi.stubEnv("DATABASE_URL", "postgresql://dummy:dummy@localhost:5432/dummy");
vi.stubEnv("JWT_SECRET", "dummy_jwt_secret_for_testing_only");
vi.stubEnv("CAMPUS_NAME", "dummy_campus");
