import { mergeConfig, defineConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      testTimeout: 15000,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.tsx"],
    },
  }),
);
