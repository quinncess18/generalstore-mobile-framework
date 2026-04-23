const { test, expect } = require('../../../fixtures/stablePage');
const LoginPage = require('../../pages/LoginPage');
const users = require('../../data/users');

/**
 * Login — Negative scenarios
 *
 * Verifies that invalid name inputs (empty, spaces-only) show the
 * "Please enter your name" toast and keep the user on the login screen.
 */
test.describe('Login — Negative', () => {
  let loginPage;

  test.beforeEach(async ({ driver }) => {
    loginPage = new LoginPage(driver);
    await loginPage.waitForScreen();
  });

  // ── TC-L-NEG01 ──────────────────────────────────────────────────────────────

  test('TC-L-NEG01: [Negative] Empty name — India, Male — toast shown, stays on Login',
    { tag: ['@smoke', '@regression'] },
    async ({ driver }) => {
      // Small stabilization pause
      await driver.pause(3000);
      await loginPage.attemptLoginWithoutName(users.TC_L_NEG01);
      const toastText = await loginPage.getToastText(3000);
      expect(toastText.toLowerCase()).toContain('please enter your name');
      expect(await loginPage.isDisplayed()).toBe(true);
    }
  );

  // ── TC-L-NEG02 ──────────────────────────────────────────────────────────────

  test('TC-L-NEG02: [Negative] Spaces-only name — Philippines, Female — toast shown, stays on Login',
  { tag: ['@regression'] },
  async ({ driver }) => {
    // 1. Bump timeout to 3 mins to absorb CI emulator cold-boot and stablePage reset
    test.setTimeout(180000); 
    
    // Small stabilization pause
    await driver.pause(3000);
    
    // 2. Pass 'false' so the POM fills the fields but STOPS before clicking
    await loginPage.login(users.TC_L_NEG02, false);
    
    // 3. Fire the click and the UIAutomator2 toast listener at the exact same time
    const [toastText] = await Promise.all([
      loginPage.getToastText(5000),
      loginPage.tapLetsShop()
    ]);
    
    expect(toastText.toLowerCase()).toContain('please enter your name');
    expect(await loginPage.isDisplayed()).toBe(true);
    }
  );
});
