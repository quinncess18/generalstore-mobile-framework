// @ts-check
const { DEVICES, APK_PATH, APPIUM_SERVER } = require('./config/devices.config');

/**
 * Global setup — runs once before any test.
 * 
 * Optimized for Physical Devices:
 *   - Removes the redundant "Ping" session which exhausts Xiaomi instrumentation.
 *   - Verifies APK presence.
 *   - Clears stale filesystem locks.
 */
async function globalSetup() {
  const serverLabel = `${APPIUM_SERVER.hostname}:${APPIUM_SERVER.port}`;
  console.log(`\n[global-setup] Appium server: ${serverLabel}`);

  if (!APK_PATH) {
    console.warn(`[global-setup] APK not found. Tests may fail if app is not installed.`);
  } else {
    console.log(`[global-setup] APK located: ${APK_PATH}`);
  }

  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  for (const device of DEVICES) {
    const lockDir = path.join(os.tmpdir(), `appium-lock-${device.udid}`);
    if (fs.existsSync(lockDir)) {
      console.log(`[global-setup] Clearing stale lock for ${device.name}...`);
      try {
        fs.rmdirSync(lockDir, { recursive: true });
      } catch (e) {
        // Ignore
      }
    }
  }

  console.log('[global-setup] Setup complete. Starting workers...\n');
}

module.exports = globalSetup;
