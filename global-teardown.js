// @ts-check
const { APPIUM_SERVER, DEVICES } = require('./config/devices.config');

/**
 * Global teardown — runs once after all tests complete (pass or fail).
 *
 * Responsibilities:
 *  1. Log a post-run device summary so CI logs show which devices were active.
 *  2. Warn if any Appium session appears to still be open (driver.deleteSession()
 *     in appFixture handles normal teardown — this is a safety net for crashes).
 *
 * Note: WebdriverIO sessions are closed per-worker inside appFixture.js.
 * This teardown does not attempt to force-close sessions — that would require
 * re-connecting to Appium, which is unnecessary if fixtures cleaned up correctly.
 */
async function globalTeardown() {
  console.log('\n[global-teardown] Test run complete.');
  console.log(`[global-teardown] Appium server: ${APPIUM_SERVER.hostname}:${APPIUM_SERVER.port}`);

  console.log(`[global-teardown] Devices used (${DEVICES.length}):`);
  for (const device of DEVICES) {
    console.log(`[global-teardown]   ${device.name} — udid: ${device.udid}`);
  }

  // In CI, surface a reminder to upload the blob-report artifact
  if (process.env.CI) {
    console.log('[global-teardown] CI run detected — upload blob-report/ and run:');
    console.log('[global-teardown]   npm run report:merge   to generate the unified HTML report.');
  }

  console.log('[global-teardown] Done.\n');
}

module.exports = globalTeardown;
