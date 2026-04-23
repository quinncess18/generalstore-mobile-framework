const { test, expect } = require('../../../fixtures/stablePage');
const LoginPage = require('../../pages/LoginPage');
const ProductsPage = require('../../pages/ProductsPage');
const CartPage = require('../../pages/CartPage');
const users = require('../../data/users');
const products = require('../../data/products');

/**
 * Cart page — product details, total amount, checkbox, website button, back navigation.
 *
 * Each test is independent — stablePage resets to the login screen before each.
 * Name is supplied by the uniqueUsername fixture (worker-scoped unique value).
 */
test.describe('Cart', () => {
  let loginPage;
  let productsPage;
  let cartPage;

  test.beforeEach(async ({ driver }) => {
    loginPage    = new LoginPage(driver);
    productsPage = new ProductsPage(driver);
    cartPage     = new CartPage(driver);
  });

  // ── TC-C01 ──────────────────────────────────────────────────────────────────
  // Single product. Verifies: name + price match, total = price, checkbox
  // unticked, proceed button + terms visible, CCT opens on button tap.

  test('TC-C01: Air Jordan 4 Retro — details match, total correct, checkbox unticked, CCT opens',
    { tag: ['@smoke', '@regression'] },
    async ({ driver, uniqueUsername }) => {
      await loginPage.login({ ...users.TC_C01, name: uniqueUsername });
      await productsPage.waitForScreen();

      const product = products.AIR_JORDAN_4_RETRO;
      const priceOnProducts = await productsPage.getProductPriceByName(product.name);
      await productsPage.addProductToCartByName(product.name);
      await productsPage.goToCart();
      await cartPage.waitForScreen();

      // Product details match
      const cartNames = await cartPage.getCartProductNames();
      expect(cartNames).toContain(product.name);

      const cartPrices = await cartPage.getCartProductPrices();
      expect(cartPrices[0]).toBe(priceOnProducts);

      // Total = single item price
      const total = await cartPage.getTotalAmount();
      expect(total).toContain(product.price.replace('$', '').trim());

      // Checkbox unchecked by default
      expect(await cartPage.isEmailOptInChecked()).toBe(false);

      // Proceed button visible and enabled
      const btn = await cartPage.visitWebsiteEl;
      expect(await btn.isDisplayed()).toBe(true);
      expect(await btn.isEnabled()).toBe(true);

      // Terms text visible
      const terms = await cartPage.getTermsText();
      expect(terms.toLowerCase()).toContain('please read our terms');

      // Proceed opens CCT (or external browser)
      await cartPage.tapVisitWebsite();
      const webView = await driver.$('//android.webkit.WebView');
      const cctOpened = await webView.waitForExist({ timeout: 10000 }).then(() => true).catch(() => false);
      const currentPkg = await driver.getCurrentPackage();
      const externalBrowserOpened = currentPkg !== 'com.androidsample.generalstore';
      expect(cctOpened || externalBrowserOpened).toBe(true);

      // Close CCT
      await driver.execute('mobile: pressKey', { keycode: 4 });
      // Add stabilization pause after closing Chrome Custom Tab
      await driver.pause(1500);
    }
  );

  // ── TC-C02 ──────────────────────────────────────────────────────────────────
  // Three products. Verifies: all names + prices in cart, total = sum, checkbox
  // unticked → ticked, CCT opens.
  //
  // SINGLE-PASS STRATEGY: Products chosen at list positions #5, #7, #9 (forward-only).
  // The test fetches the price and immediately clicks "Add to Cart" while the item 
  // is on-screen. Combined with W3C pointer actions, this completely eliminates 
  // backward-scrolling and bypasses the OnePlus OS gesture traps.

  test('TC-C02: Air Jordan 9 Retro + Jordan Lift Off + PG 3 — total = sum, checkbox toggleable, CCT opens',
    { tag: ['@regression'] },
    async ({ driver, uniqueUsername }) => {
      // Pause for 3 seconds before adding items to cart as requested
      await driver.pause(3000);

      await loginPage.login({ ...users.TC_C02, name: uniqueUsername });
      await productsPage.waitForScreen();

      const item1 = products.AIR_JORDAN_9_RETRO;
      const item2 = products.JORDAN_LIFT_OFF;
      const item3 = products.PG_3;

      // ---------------------------------------------------------
      // THE SINGLE-PASS STRATEGY
      // Fetch price, then immediately add to cart before scrolling
      // ---------------------------------------------------------

      // Item 1: Air Jordan 9 Retro
      const price1 = await productsPage.getProductPriceByName(item1.name);
      await productsPage.addProductToCartByName(item1.name); 

      // Item 2: Jordan Lift Off
      const price2 = await productsPage.getProductPriceByName(item2.name);
      await productsPage.addProductToCartByName(item2.name);

      // Item 3: PG 3
      const price3 = await productsPage.getProductPriceByName(item3.name);
      await productsPage.addProductToCartByName(item3.name);

      if (process.env.DEBUG === 'true') console.log('[Test] TC-C02: Navigating to cart');
      await productsPage.goToCart();
      await cartPage.waitForScreen();

      // All 3 items present
      if (process.env.DEBUG === 'true') console.log('[Test] TC-C02: Verifying items in cart');
      expect(await cartPage.getItemCount()).toBe(3);
      const cartNames = await cartPage.getCartProductNames();
      expect(cartNames).toContain(item1.name);
      expect(cartNames).toContain(item2.name);
      expect(cartNames).toContain(item3.name);

      // All prices in $ format
      const cartPrices = await cartPage.getCartProductPrices();
      for (const price of cartPrices) {
        expect(price).toMatch(/\$/);
      }

      // Total = sum of all three cart row prices (source of truth)
      if (process.env.DEBUG === 'true') console.log('[Test] TC-C02: Verifying total amount');
      const parse = (str) => parseFloat(str.replace('$', '').trim());
      const expectedTotal = cartPrices
        .reduce((sum, price) => sum + parse(price), 0)
        .toFixed(2);
      const actualTotal = parse(await cartPage.getTotalAmount()).toFixed(2);
      expect(actualTotal).toBe(expectedTotal);

      // Checkbox unchecked → tick it → verify ticked
      if (process.env.DEBUG === 'true') console.log('[Test] TC-C02: Testing checkbox toggle');
      expect(await cartPage.isEmailOptInChecked()).toBe(false);
      
      // Settle pause before checkbox click
      await driver.pause(2000);
      await cartPage.setEmailOptIn(true);
      
      // Settle pause after checkbox click
      await driver.pause(1000);
      expect(await cartPage.isEmailOptInChecked()).toBe(true);

      // Proceed opens CCT (or external browser)
      if (process.env.DEBUG === 'true') console.log('[Test] TC-C02: Tapping Visit Website');
      await cartPage.tapVisitWebsite();
      const webView = await driver.$('//android.webkit.WebView');
      const cctOpened = await webView.waitForExist({ timeout: 10000 }).then(() => true).catch(() => false);
      const currentPkg = await driver.getCurrentPackage();
      const externalBrowserOpened = currentPkg !== 'com.androidsample.generalstore';
      expect(cctOpened || externalBrowserOpened, `Browser did not open. Package: ${currentPkg}`).toBe(true);

      // Close CCT
      if (process.env.DEBUG === 'true') console.log('[Test] TC-C02: Closing browser');
      await driver.execute('mobile: pressKey', { keycode: 4 });
      // Add stabilization pause after closing Chrome Custom Tab
      await driver.pause(1500);
    }
  );

  // ── TC-C03 ──────────────────────────────────────────────────────────────────
  // Full back navigation flow:
  //   Cart → back → Products (intact, cart preserved) →
  //   back → Login (credentials retained) →
  //   re-login (Let's Shop) → Products (cart empty) → toast.

  test('TC-C03: Back nav — Cart→Products (intact)→Login (creds retained)→re-login→empty cart toast',
    { tag: ['@regression'] },
    async ({ driver, uniqueUsername }) => {
      await loginPage.login({ ...users.TC_C03_RELOGIN, name: uniqueUsername });
      await productsPage.waitForScreen();

      // Use a product that is not the absolute last item to avoid bottom-edge clipping issues on some screens
      await productsPage.addProductToCartByName(products.CONVERSE_ALL_STAR.name);
      await productsPage.goToCart();
      await cartPage.waitForScreen();

      // Step 1: Back from Cart → Products
      await cartPage.goBack();
      await productsPage.waitForScreen();
      expect(await productsPage.isDisplayed()).toBe(true);

      // Step 2: Cart state preserved — badge still shows 1
      // waitUntil: badge renders asynchronously after back navigation on some devices
      await driver.waitUntil(
        async () => (await productsPage.getCartCount()) === 1,
        { timeout: 5000, timeoutMsg: 'Cart badge did not update to 1 after back nav from Cart' }
      );
      expect(await productsPage.getCartCount()).toBe(1);

      // Step 3: Back from Products → Login; credentials retained
      await productsPage.goBack();
      await loginPage.waitForScreen();
      expect(await loginPage.isDisplayed()).toBe(true);
      expect(await loginPage.getSelectedCountry()).toBe(users.TC_C03_RELOGIN.country);

      // Step 4: Re-login (tap Let's Shop — fields already filled)
      await loginPage.tapLetsShop();
      await productsPage.waitForScreen();

      // Step 5: Cart is empty after new session — toast shown, stays on Products
      await productsPage.goToCart();
      const toastText = await productsPage.getToastText(3000);
      expect(toastText.toLowerCase()).toContain('please add some product at first');
      expect(await productsPage.isDisplayed()).toBe(true);
    }
  );

  // ── TC-C04 ──────────────────────────────────────────────────────────────────
  // Stress Test: All 10 products. Verifies: count=10, total = sum(all).

  test('TC-C04: Stress Test — 10 items in cart, verify total sum and scroll reachability',
    { tag: ['@regression'] },
    async ({ driver, uniqueUsername }) => {
      // Use longer timeout for 10-item discovery and cart scroll
      test.setTimeout(240000);

      // Pause for 3 seconds before adding items to cart as requested
      await driver.pause(3000);

      await loginPage.login({ ...users.TC_PRODUCTS, name: uniqueUsername });
      await productsPage.waitForScreen();

      const allProducts = Object.values(products);
      
      // Add every single product in the list (forward-only)
      for (const product of allProducts) {
        await productsPage.addProductToCartByName(product.name);
      }

      expect(await productsPage.getCartCount()).toBe(10);
      await productsPage.goToCart();
      await cartPage.waitForScreen();

      // Verify all 10 items are present (Stresses the CartPage scroll loop)
      const cartNames = await cartPage.getCartProductNames();
      expect(cartNames.length).toBe(10);

      // Verify Total = sum of all item prices
      const parse = (str) => parseFloat(str.replace('$', '').trim());
      const expectedSum = allProducts.reduce((acc, p) => acc + parse(p.price), 0).toFixed(2);
      
      const actualTotal = parse(await cartPage.getTotalAmount()).toFixed(2);
      expect(actualTotal).toBe(expectedSum);
    }
  );
});
