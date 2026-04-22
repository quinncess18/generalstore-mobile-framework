// @ts-check
/**
 * Central device configuration for the Appium test framework.
 *
 * All values can be overridden via environment variables — no code changes needed
 * for CI/CD pipelines or when switching to different hardware.
 *
 * CI/CD usage examples:
 *
 *   # Run on emulator (default):
 *   npm test
 *
 *   # Override Appium server (remote Appium node, Docker, etc.):
 *   APPIUM_HOST=192.168.1.100 APPIUM_PORT=4723 npm test
 *
 *   # Set multiple dynamic devices in CI:
 *   DEVICE_0_UDID=emulator-5554 DEVICE_1_UDID=emulator-5556 npm test
 */

const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Appium server — single Appium 2.x instance
// ---------------------------------------------------------------------------
const APPIUM_SERVER = {
  protocol: 'http',
  hostname: process.env.APPIUM_HOST || '127.0.0.1',
  port: parseInt(process.env.APPIUM_PORT || '4723', 10),
  path: '/',
};

// ---------------------------------------------------------------------------
// APK path — defaults to apps/General-Store.apk relative to project root
// Set APP_PATH env var to an absolute path to override (e.g. in CI artifacts)
// ---------------------------------------------------------------------------
const _defaultApkPath = path.resolve(__dirname, '..', 'apps', 'General-Store.apk');
const APK_PATH = process.env.APP_PATH || (fs.existsSync(_defaultApkPath) ? _defaultApkPath : null);

// ---------------------------------------------------------------------------
// Device registry (Dynamically scales via Environment Variables for CI)
// ---------------------------------------------------------------------------
const _allDevices = [];
let hasEnvDevices = false;

// Check for up to 10 devices defined via environment variables
for (let i = 0; i < 10; i++) {
  if (process.env[`DEVICE_${i}_UDID`]) {
    hasEnvDevices = true;
    _allDevices.push({
      name: process.env[`DEVICE_${i}_NAME`] || `Device ${i}`,
      udid: process.env[`DEVICE_${i}_UDID`],
      systemPort: parseInt(process.env[`DEVICE_${i}_SYSTEM_PORT`] || String(8200 + i), 10),
      chromeDriverPort: parseInt(process.env[`DEVICE_${i}_CHROMEDRIVER_PORT`] || String(9515 + i), 10),
      testTimeout: parseInt(process.env[`DEVICE_${i}_TIMEOUT`] || '180000', 10),
      scrollPercent: parseFloat(process.env[`DEVICE_${i}_SCROLL_PERCENT`] || '0.10'),
      settlePause: parseInt(process.env[`DEVICE_${i}_SETTLE_PAUSE`] || '800', 10),
    });
  }
}

// Fallback for local testing if no environment variables are set
if (!hasEnvDevices) {
  _allDevices.push(
    {
      name: 'Pixel 5 (Local)',
      udid: 'emulator-5554',
      systemPort: 8200,
      chromeDriverPort: 9515,
      testTimeout: 180000,
      scrollPercent: 0.10,
      settlePause: 800,
    },
    {
      name: 'Pixel Tablet',
      udid: 'emulator-5556',
      systemPort: 8201,
      chromeDriverPort: 9516,
      testTimeout: 180000,
      scrollPercent: 0.10,
      settlePause: 800,
    }
  );
}

const _deviceCount = process.env.DEVICE_COUNT
  ? parseInt(process.env.DEVICE_COUNT, 10)
  : _allDevices.length;

const DEVICES = _allDevices.slice(0, _deviceCount);

module.exports = { APPIUM_SERVER, APK_PATH, DEVICES };
