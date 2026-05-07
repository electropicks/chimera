import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "packages",
          include: ["packages/**/*.{test,spec}.ts"],
        },
      },
      {
        test: {
          name: "tools",
          include: ["tools/**/*.{test,spec}.ts"],
        },
      },
    ],
  },
});
