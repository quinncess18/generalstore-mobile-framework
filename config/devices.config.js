// @ts-check
/**
 * Central device configuration for the multi-device Appium test framework.
 *
 * All values can be overridden via environment variables — no code changes needed
 * for CI/CD pipelines or when switching to different hardware.
 *
 * CI/CD usage examples:
 *
 *   # Run on both real devices (default):
 *   npm test
 *
 *   # Override Appium server (remote Appium node, Docker, etc.):
 *   APPIUM_HOST=192.168.1.100 APPIUM_PORT=4723 npm test
 *
 *   # Override APK path:
 *   APP_PATH=/builds/artifacts/General-Store.apk npm test
 *
 *   # Override device 0 (OnePlus 12):
 *   DEVICE_0_UDID=emulator-5554 DEVICE_0_SYSTEM_PORT=8200 npm test
 *
 *   # Override device 1 (Xiaomi Pad 6):
 *   DEVICE_1_UDID=emulator-5556 DEVICE_1_SYSTEM_PORT=8201 npm test
 *
 *   # Single-device run (use only DEVICES[0] with 1 worker):
 *   npx playwright test --workers=1
 */

const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Appium server — single Appium 2.x instance connected to both real devices
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
// Device registry — add, remove, or reorder devices here.
// Worker 0 → DEVICES[0], Worker 1 → DEVICES[1], etc.
// workers: DEVICES.length in playwright.config.js keeps them in sync automatically.
//
// DEVICE_COUNT — limit how many devices are active without editing this file.
//   DEVICE_COUNT=1 npm test   → only DEVICES[0] runs (1 worker)
//   DEVICE_COUNT=2 npm test   → both devices run (2 workers, default)
// ---------------------------------------------------------------------------
const _allDevices = [
  {
    name: 'OnePlus 12',
    udid: process.env.DEVICE_0_UDID || '7be9397b',
    systemPort: parseInt(process.env.DEVICE_0_SYSTEM_PORT || '8200', 10),
    chromeDriverPort: parseInt(process.env.DEVICE_0_CHROMEDRIVER_PORT || '9515', 10),
    testTimeout: 180000,  // 3 min — aligned with observed OnePlus TC-C02 runtime
    // scrollPercent: safe for gesture nav — 0.22 triggers the OnePlus OS app-switcher
    scrollPercent: parseFloat(process.env.DEVICE_0_SCROLL_PERCENT || '0.10'),
    // settlePause: extra wait after UiScrollable before $$() snapshots (RecyclerView inertia)
    settlePause: parseInt(process.env.DEVICE_0_SETTLE_PAUSE || '800', 10),
  },
  {
    name: 'Xiaomi Pad 6',
    udid: process.env.DEVICE_1_UDID || 'ce9c0b3b',
    systemPort: parseInt(process.env.DEVICE_1_SYSTEM_PORT || '8201', 10),
    chromeDriverPort: parseInt(process.env.DEVICE_1_CHROMEDRIVER_PORT || '9516', 10),
    testTimeout: 180000,  // 3 min — tablet is slower, especially on multi-product tests
    scrollPercent: parseFloat(process.env.DEVICE_1_SCROLL_PERCENT || '0.22'),
    settlePause: parseInt(process.env.DEVICE_1_SETTLE_PAUSE || '300', 10),
  },
];

const _deviceCount = process.env.DEVICE_COUNT
  ? parseInt(process.env.DEVICE_COUNT, 10)
  : _allDevices.length;

const DEVICES = _allDevices.slice(0, _deviceCount);

module.exports = { APPIUM_SERVER, APK_PATH, DEVICES };
