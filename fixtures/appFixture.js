const { test: base } = require('@playwright/test');
const { remote } = require('webdriverio');
const { APPIUM_SERVER, APK_PATH, DEVICES } = require('../config/devices.config');

/**
 * appFixture — creates one WebdriverIO Appium session per Playwright worker
 * and tears it down after all tests in that worker finish.
 *
 * Device assignment:
 *   Each project in playwright.config.js sets `use: { deviceConfig: DEVICES[n] }`.
 *   Playwright routes tests from the same project to the same worker, so each
 *   device gets exactly one persistent Appium session for the duration of the run.
 *
 * Usage:
 *   const { test } = require('../../fixtures/appFixture');
 *   test('my test', async ({ driver }) => { ... });
 */
const test = base.extend({
  /**
   * driver — worker-scoped: one Appium session for all tests on this worker's device.
   *
   * Device is read from workerInfo.project.use.deviceConfig — set per project in
   * playwright.config.js. Falls back to DEVICES[0] for direct file runs without
   * a project config (e.g. npx playwright test path/to/spec.js).
   */
  driver: [
    async ({}, use, workerInfo) => {
      const projectName = workerInfo.project.name;
      const device = DEVICES.find(d => d.name === projectName) || DEVICES[0];

      console.log(`[appFixture] ${device.name} (${device.udid})`);

      const capabilities = {
        platformName: 'Android',
        'appium:automationName': 'UIAutomator2',
        'appium:deviceName': device.name,
        'appium:udid': device.udid,
        'appium:systemPort': device.systemPort,
        'appium:chromeDriverPort': device.chromeDriverPort,
        'appium:appPackage': 'com.androidsample.generalstore',
        'appium:appActivity': 'com.androidsample.generalstore.SplashActivity',
        'appium:noReset': true,
        'appium:fullReset': false,
        'appium:newCommandTimeout': 300,
        'appium:autoGrantPermissions': true,
        ...(APK_PATH ? { 'appium:app': APK_PATH } : {}),
      };

      const driver = await remote({
        ...APPIUM_SERVER,
        capabilities,
        logLevel: 'warn',
      });

      // Detect gesture navigation mode — any Android 10+ device with swipe-nav enabled
      // can trigger the OS app-switcher from a bottom-edge scroll. We query the real
      // system setting instead of guessing from device name.
      // navigation_mode: 0 = 3-button, 1 = 2-button, 2 = full gesture (swipe)
      let hasGestureNav = false;
      try {
        const navMode = await driver.execute('mobile: shell', {
          command: 'settings',
          args: ['get', 'secure', 'navigation_mode'],
        });
        hasGestureNav = String(navMode).trim() === '2';
      } catch {
        // Shell access unavailable or setting absent (older Android) — assume no gesture nav
      }

      // Attach device profile to driver — page objects read this instead of inspecting
      // capabilities.deviceName, making scroll behaviour device-agnostic.
      driver._deviceProfile = {
        name: device.name,
        scrollPercent: device.scrollPercent,
        settlePause:   device.settlePause,
        hasGestureNav,
      };

      console.log(
        `[appFixture] ${device.name} (${device.udid}) — ` +
        `gesture nav: ${hasGestureNav}, ` +
        `scrollPercent: ${device.scrollPercent}, ` +
        `settlePause: ${device.settlePause}ms`
      );

      await use(driver);

      // Teardown — close the session after all tests in this worker complete.
      // .catch ensures a clean exit even if the session was already closed by
      // a previous error (avoids masking the real failure with a teardown error).
      await driver.deleteSession().catch((err) => {
        console.warn(`[appFixture] deleteSession warning (${device.name}): ${err.message}`);
      });
    },
    { scope: 'worker' },
  ],
});

const { expect } = base;

module.exports = { test, expect };