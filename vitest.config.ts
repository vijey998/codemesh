import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", exclude: ["examples/**", "node_modules/**", "dist/**"], coverage: { reporter: ["text", "html"] } },
});
