import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: "**/captcha.spec.ts",
  webServer: {
    ...base.webServer,
    command: "node scripts/e2e-server.mjs",
    env: { E2E_CAPTCHA: "true" },
  },
});
