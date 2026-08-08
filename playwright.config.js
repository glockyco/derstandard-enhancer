import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /controller\.test\.js$/,
  timeout: 10_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    browserName: "chromium",
    headless: true,
  },
});
