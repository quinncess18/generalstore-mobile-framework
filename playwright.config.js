// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: __dirname + '/tests/specs',
  testMatch: '**/*.spec.js',
  timeout: 60000,
  
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  failOnFlakyTests: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  
  // Exactly 1 worker, because there is exactly 1 cloud emulator
  workers: 1, 

  reporter: [
    ['list'],
    ['blob'],
    ['html', { open: process.env.CI ? 'never' : 'on-failure', outputFolder: 'playwright-report' }],
  ],

  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
});