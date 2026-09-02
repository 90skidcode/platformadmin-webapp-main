import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "server-only": path.resolve(
        import.meta.dirname,
        "./src/test/server-only-mock.ts",
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    pool: "forks",
    fileParallelism: false,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    reporters: ["verbose"],
    printConsoleTrace: true,
    exclude: ["node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/app/**",
        "src/test/**",
      ],
    },
  },
});
