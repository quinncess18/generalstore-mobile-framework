const { test, expect } = require('../../../fixtures/stablePage');
const LoginPage = require('../../pages/LoginPage');
const ProductsPage = require('../../pages/ProductsPage');
const users = require('../../data/users');
const products = require('../../data/products');

/**
 * App Interruptions — Template for handling OS-level events.
 *
 * TC-I01: Background/Foreground — verifies state preservation when the app is
 * sent to the background and then returned to the foreground.
 */
test.describe('App Interruptions', () => {
  let loginPage;
  let productsPage;

  test.beforeEach(async ({ driver }) => {
    loginPage    = new LoginPage(driver);
    productsPage = new ProductsPage(driver);
  });

  // ── TC-I01 ──────────────────────────────────────────────────────────────────

  test('TC-I01: Background/Foreground — state preserved after 5s backgrounding',
    { tag: ['@regression'] },
    async ({ driver }) => {
      await loginPage.login(users.TC_PRODUCTS);
      await productsPage.waitForScreen();

      // Step 1: Add a product to the cart
      await productsPage.addProductToCartByName(products.AIR_JORDAN_4_RETRO.name);
      expect(await productsPage.getCartCount()).toBe(1);

      // Step 2: Send app to background for 5 seconds
      console.log('[Diagnostic] Sending app to background for 5s...');
      await driver.background(5);

      // Step 3: Verify app returns to the same screen and state is intact
      await productsPage.waitForScreen();
      expect(await productsPage.isDisplayed()).toBe(true);
      expect(await productsPage.getCartCount()).toBe(1);
      
      // Step 4: Verify interaction still works
      await productsPage.addProductToCartByName(products.JORDAN_6_RINGS.name);
      expect(await productsPage.getCartCount()).toBe(2);
    }
  );
});
