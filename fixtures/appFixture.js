const { test: base } = require('@playwright/test');
const { remote } = require('webdriverio');

const test = base.extend({
  driver: [
    async ({}, use) => {
      console.log(`[appFixture] Connecting to Cloud Emulator...`);

      const driver = await remote({
        protocol: 'http',
        hostname: '127.0.0.1', // GitHub Actions local host
        port: 4723,            // Default Appium port
        path: '/',             // Appium 2.x standard path
        capabilities: {
          platformName: 'Android',
          'appium:automationName': 'UIAutomator2',
          'appium:appPackage': 'com.androidsample.generalstore',
          'appium:appActivity': 'com.androidsample.generalstore.SplashActivity',
          'appium:noReset': true,
          'appium:fullReset': false,
          'appium:autoGrantPermissions': true,
          // Uses the CI path if provided, otherwise falls back to your local repo folder
          'appium:app': process.env.APP_PATH || './apps/General-Store.apk',
        },
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
        name: 'Cloud Emulator',
        scrollPercent: 0.10,
        settlePause: 500,
        hasGestureNav,
      };

      console.log(
        `[appFixture] Cloud Emulator — ` +
        `gesture nav: ${hasGestureNav}, ` +
        `scrollPercent: 0.10, ` +
        `settlePause: 1000ms`
      );

      await use(driver);

      await driver.deleteSession().catch((err) => {
        console.warn(`[appFixture] Teardown warning: ${err.message}`);
      });
    },
    { scope: 'worker' },
  ],
});

const { expect } = base;
module.exports = { test, expect };
