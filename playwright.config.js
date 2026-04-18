// @ts-check
const { defineConfig } = require('@playwright/test');
const { DEVICES } = require('./config/devices.config');

/**
 * Playwright config for Android mobile automation via Appium + UIAutomator2.
 * Tests use WebdriverIO remote driver (not Playwright browser) — config here
 * governs the test runner only (timeout, retries, reporters).
 *
 * Cross-device validation:
 *   Every test runs on every device simultaneously.
 *   Projects are generated dynamically from DEVICES — one e2e project and one
 *   negative project per device. Each project injects its device via the
 *   deviceConfig option, which appFixture uses to open the Appium session.
 *
 *   workers = DEVICES.length — one persistent Appium session per device.
 *   fullyParallel: false — tests within the same file+project run sequentially on
 *   one worker. Playwright assigns one worker per project per file, so each device
 *   gets a dedicated worker with no cross-contamination.
 *
 * Each test is self-contained: stablePage resets to login before every test.
 */
module.exports = defineConfig({
  testMatch: '**/*.spec.js',

  timeout: 60000,       // 60 s per test — mobile actions are slower than web
  expect: {
    timeout: 15000,     // 15 s for assertions
  },

  globalSetup: './global-setup.js',
  globalTeardown: './global-teardown.js',

  // Run tests in parallel across all available workers.
  // Each worker owns one Appium session on one physical device.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  failOnFlakyTests: !!process.env.CI,  // flaky pass-on-retry still fails the build in CI
  retries: process.env.CI ? 1 : 0,
  workers: DEVICES.length,  // one worker per device — keep in sync with DEVICES array

  reporter: [
    ['list'],
    ['blob'],
    ['html', { open: process.env.CI ? 'never' : 'on-failure', outputFolder: 'playwright-report' }],
  ],

  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    // Appium capabilities and server config are set per-device inside
    // fixtures/appFixture.js using config/devices.config.js — not here.
  },

  projects: [
    ...DEVICES.map((device) => ({
      name: `e2e » ${device.name}`,
      testDir: './tests/specs/e2e',
      use: { deviceConfig: device },
      timeout: device.testTimeout,
    })),
    ...DEVICES.map((device) => ({
      name: `negative » ${device.name}`,
      testDir: './tests/specs/negative',
      use: { deviceConfig: device },
      timeout: device.testTimeout,
    })),
  ],
});
