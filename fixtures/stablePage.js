const { test: uniqueTest, expect } = require('./uniqueUsername');

/**
 * stablePage fixture — ensures the app is on the login screen before each test.
 *
 * Strategy:
 *   1. Check if already on login (isOnLogin). If yes, skip reset — avoids a
 *      redundant SplashActivity launch on the first test of each worker since
 *      appFixture already lands on the login screen.
 *   2. If not on login, fire mobile: startActivity to launch SplashActivity,
 *      wait for LoginActivity to appear, then pause 800 ms to let it settle.
 *
 * Usage:
 *   const { test } = require('../../fixtures/stablePage');
 *   test('my test', async ({ driver, uniqueUsername }) => { ... });
 */
const test = uniqueTest.extend({
  driver: async ({ driver }, use) => {
    const SPINNER =
      '//android.widget.Spinner[@resource-id="com.androidsample.generalstore:id/spinnerCountry"]';
    const NAME_FIELD =
      '//android.widget.EditText[@resource-id="com.androidsample.generalstore:id/nameField"]';
    const PRODUCT_LIST =
      '//android.support.v7.widget.RecyclerView[@resource-id="com.androidsample.generalstore:id/rvProductList"]';

    // isOnLogin is true ONLY IF:
    // 1. The login components are visible AND
    // 2. The products list is NOT visible (negative proof against ghost elements).
    const isOnLogin = async () => {
      try {
        const isProductsVisible = await driver.$(PRODUCT_LIST).isDisplayed().catch(() => false);
        if (isProductsVisible) return false;

        const spinner    = await driver.$(SPINNER);
        const nameField  = await driver.$(NAME_FIELD);
        return (await spinner.isDisplayed().catch(() => false)) &&
               (await nameField.isDisplayed().catch(() => false));
      } catch {
        return false;
      }
    };

    // Skip reset if already on the login screen — avoids a redundant SplashActivity
    // launch on the very first test of each worker (appFixture already lands on login).
    if (!await isOnLogin()) {
      // Launch SplashActivity to reset the app to the login screen.
      //
      // Why not terminateApp + activateApp:
      //   terminateApp force-kills the app process (am force-stop), which also kills
      //   the UIAutomator2 instrumentation server running in that process, orphaning
      //   the Appium session and causing 404 "invalid session id" errors on subsequent
      //   commands.
      //
      // Why not driver.startActivity():
      //   The old endpoint routes through adb.startApp() which calls am force-stop
      //   before launching (stopApp defaults to true via !dontStopAppOnReset). This
      //   force-kills the app process — and UIAutomator2 instrumentation runs in that
      //   same process — which orphans the Appium session (404 "invalid session id").
      //
      // Why mobile: startActivity works:
      //   It maps directly to mobileStartActivity() which runs
      //   `adb shell am start-activity -n <component>` via adb.shell() — no force-stop,
      //   no app management, no session impact. stop: false (default) omits the -S flag.
      //   The existing back stack is left intact so SplashActivity starts cleanly on
      //   top; the 2-3 s splash animation then transitions to LoginActivity.
      await driver.execute('mobile: startActivity', {
        component: 'com.androidsample.generalstore/.SplashActivity',
        stop: false,
      });
// Wait for the login screen to be ready after the splash animation.
// 15s timeout is standard, but we add a brief settle after it's found.
await driver.waitUntil(isOnLogin, {
  timeout: 20000,
  timeoutMsg: 'stablePage: login screen did not appear after startActivity',
});

// Device-specific settle time
const settle = driver._deviceProfile?.settlePause ?? 800;
await driver.pause(settle);

      // Brief settle — SplashActivity → LoginActivity transition may still be animating
      // when waitUntil returns, particularly on the Xiaomi Pad 6 (tablet). Without this,
      // the spec's own waitForScreen() can fire before the login screen is fully stable.
      await driver.pause(800);
    } else {
      // Already on the login screen — pause to let any incoming transition finish.
      // 500ms was insufficient after long tests (>1 min) on the Xiaomi Pad 6 tablet —
      // the back-navigation animation to LoginActivity needs more settle time.
      await driver.pause(1500);
    }

    await use(driver);
  },
});

module.exports = { test, expect };
