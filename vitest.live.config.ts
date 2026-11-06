import { defineConfig } from "vitest/config";

// Testes contra redes de teste reais (Sepolia, Arkiv Rabdi, World ID Staging) usando o .env
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/live/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
