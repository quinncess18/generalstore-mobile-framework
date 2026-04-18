// @ts-check
const { remote } = require('webdriverio');
const { APPIUM_SERVER, APK_PATH, DEVICES } = require('./config/devices.config');

/**
 * Global setup — runs once before any test.
 * 1. Warns if the APK is missing.
 * 2. Opens a ping session to each configured device to verify:
 *    - Appium server is reachable
 *    - Each device's UDID is connected and authorised
 *
 * If any device is unreachable the full error is surfaced so you can fix it
 * before wasting time on partial test runs.
 */
async function globalSetup() {
  const serverLabel = `${APPIUM_SERVER.hostname}:${APPIUM_SERVER.port}`;
  console.log(`\n[global-setup] Appium server: ${serverLabel}`);

  // -------------------------------------------------------------------------
  // APK check — hard fail in CI, warn locally (app may already be installed)
  // -------------------------------------------------------------------------
  if (!APK_PATH) {
    const message =
      `[global-setup] APK not found.\n` +
      `  Place General-Store.apk in apps/ or set APP_PATH=<absolute-path>.`;
    if (process.env.CI) {
      throw new Error(message);
    }
    console.warn(`${message}\n  Continuing — tests will fail if the app is not already installed on the device.`);
  } else {
    console.log(`[global-setup] APK located: ${APK_PATH}`);
  }

  // -------------------------------------------------------------------------
  // Ping each device — fail fast if any device is not reachable
  // -------------------------------------------------------------------------
  console.log(`[global-setup] Pinging ${DEVICES.length} device(s)...`);

  for (const device of DEVICES) {
    process.stdout.write(`[global-setup]   ${device.name} (${device.udid}) ... `);

    try {
      const driver = await remote({
        ...APPIUM_SERVER,
        capabilities: /** @type {any} */ ({
          platformName: 'Android',
          'appium:automationName': 'UIAutomator2',
          'appium:deviceName': device.name,
          'appium:udid': device.udid,
          'appium:systemPort': device.systemPort,
          'appium:chromeDriverPort': device.chromeDriverPort,
          'appium:appPackage': 'com.androidsample.generalstore',
          'appium:appActivity': 'com.androidsample.generalstore.SplashActivity',
          ...(APK_PATH ? { 'appium:app': APK_PATH } : {}),
          'appium:noReset': true,        // Quick ping — don't wipe state
          'appium:newCommandTimeout': 30,
          'appium:autoGrantPermissions': true,
        }),
        logLevel: 'warn',
      });

      await driver.deleteSession();
      console.log('OK');
    } catch (err) {
      console.log('FAILED');
      throw new Error(
        `[global-setup] Device "${device.name}" (udid: ${device.udid}) is unreachable.\n` +
        `  Check that:\n` +
        `    1. Appium is running:  npx appium --port ${APPIUM_SERVER.port}\n` +
        `    2. Device is listed:   adb devices\n` +
        `    3. Device is authorised (accept the USB debugging prompt on the device)\n` +
        `  Original error: ${/** @type {Error} */ (err).message}`
      );
    }
  }

  console.log('[global-setup] All devices reachable. Starting tests...\n');
}

module.exports = globalSetup;
