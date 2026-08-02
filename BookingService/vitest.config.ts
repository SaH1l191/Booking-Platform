import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ["src/**/*.test.ts"],
    globalSetup: "./src/__tests__/setup.ts",
    setupFiles: ["./src/__tests__/env.ts"],
    forceExit: true,
    env: {
      DATABASE_URL: "mysql://root:root@localhost:3306/booking_test",
      REDIS_SERVER_URL: "redis://localhost:6379",
      HOTEL_SERVICE_URL: "http://localhost:3001",
      REDLOCK_TTL: "8000",
      BOOKING_EXPIRY_MS: "900000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
