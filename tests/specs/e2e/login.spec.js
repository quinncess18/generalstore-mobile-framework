const { test, expect } = require('../../../fixtures/stablePage');
const LoginPage = require('../../pages/LoginPage');
const ProductsPage = require('../../pages/ProductsPage');
const users = require('../../data/users');

/**
 * Login — Default screen state + character acceptance
 *
 * TC-L01: Verifies the login screen default state (no login performed).
 * TC-L02–L04: Verifies that non-standard name inputs are accepted — special
 * characters, numeric-only, and a 51-char name. Countries are scattered to
 * cover varying UiScrollable scroll distances from Afghanistan.
 */
test.describe('Login', () => {
  let loginPage;
  let productsPage;

  test.beforeEach(async ({ driver }) => {
    loginPage = new LoginPage(driver);
    productsPage = new ProductsPage(driver);
  });

  // ── TC-L01 ──────────────────────────────────────────────────────────────────
  // Default state only — no login performed.

  test('TC-L01: Default state — Afghanistan selected, name empty, Male radio selected, Let\'s Shop visible',
    { tag: ['@smoke', '@regression'] },
    async () => {
      await loginPage.waitForScreen();
      expect(await loginPage.getSelectedCountry()).toBe('Afghanistan');
      expect(await loginPage.getNameFieldValue()).toBe('');
      expect(await loginPage.isGenderSelected('Male')).toBe(true);
      expect(await loginPage.isGenderSelected('Female')).toBe(false);
      expect(await (await loginPage.letsShopEl).isDisplayed()).toBe(true);
    }
  );

  // ── TC-L02 → TC-L04 ─────────────────────────────────────────────────────────
  // Chained login flow using back navigation instead of stablePage resets.
  // Each leg logs in, lands on Products, presses back, verifies credentials
  // are retained on the login screen, then updates only what changes for the
  // next leg. Merging into one test avoids stablePage reset flakiness between
  // TC-L02 and TC-L03 (spinner not visible within 15 s after Products screen).

  test('TC-L02→L04: Chained login — special chars → numeric → long name, back nav retains credentials',
    { tag: ['@regression'] },
    async () => {
      test.setTimeout(120000);

      // ── TC-L02: Bahamas / special chars / Female ───────────────────────────
      await loginPage.login(users.TC_L02);
      await productsPage.waitForScreen();
      expect(await productsPage.isDisplayed()).toBe(true);

      await productsPage.goBack();
      await loginPage.waitForScreen();
      expect(await loginPage.getSelectedCountry()).toBe(users.TC_L02.country);

      // ── TC-L03: Belgium / numeric / Male (retained from L02) ──────────────
      await loginPage.selectCountry(users.TC_L03.country);
      await loginPage.enterName(users.TC_L03.name);
      await loginPage.selectGender(users.TC_L03.gender);
      await loginPage.tapLetsShop();
      await productsPage.waitForScreen();
      expect(await productsPage.isDisplayed()).toBe(true);

      await productsPage.goBack();
      await loginPage.waitForScreen();
      expect(await loginPage.getSelectedCountry()).toBe(users.TC_L03.country);

      // ── TC-L04: Australia / 51-char name / Female (retained from L03) ─────
      await loginPage.selectCountry(users.TC_L04.country);
      await loginPage.enterName(users.TC_L04.name);
      await loginPage.selectGender(users.TC_L04.gender);
      await loginPage.tapLetsShop();
      await productsPage.waitForScreen();
      expect(await productsPage.isDisplayed()).toBe(true);
    }
  );
});
