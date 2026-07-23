import { vi } from "vitest";

// Mock environment variables required by src/lib/env.ts
vi.stubEnv("DATABASE_URL", "postgresql://dummy:dummy@localhost:5432/dummy");
vi.stubEnv("JWT_SECRET", "dummy_jwt_secret_for_testing_only");
vi.stubEnv("CAMPUS_NAME", "dummy_campus");

// Node 22+ ships a native `localStorage` global that stays undefined unless
// `--localstorage-file` is passed. Vitest's jsdom environment doesn't override
// it (it's not in its populated-keys list), so it shadows jsdom's real
// implementation. Polyfill it here so tests that touch localStorage work.
class LocalStorageMock implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new LocalStorageMock(),
  configurable: true,
  writable: true,
});
