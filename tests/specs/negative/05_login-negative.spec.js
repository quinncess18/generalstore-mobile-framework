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
    async () => {
      await loginPage.attemptLoginWithoutName(users.TC_L_NEG01);
      const toastText = await loginPage.getToastText(3000);
      expect(toastText.toLowerCase()).toContain('please enter your name');
      expect(await loginPage.isDisplayed()).toBe(true);
    }
  );

  // ── TC-L-NEG02 ──────────────────────────────────────────────────────────────

  test('TC-L-NEG02: [Negative] Spaces-only name — Philippines, Female — toast shown, stays on Login',
    { tag: ['@regression'] },
    async () => {
      test.setTimeout(120000);
      await loginPage.selectCountry(users.TC_L_NEG02.country);
      await loginPage.enterName(users.TC_L_NEG02.name);
      await loginPage.selectGender(users.TC_L_NEG02.gender);
      await loginPage.tapLetsShop();
      const toastText = await loginPage.getToastText(3000);
      expect(toastText.toLowerCase()).toContain('please enter your name');
      expect(await loginPage.isDisplayed()).toBe(true);
    }
  );
});
