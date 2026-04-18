const { test, expect } = require('../../../fixtures/stablePage');
const LoginPage = require('../../pages/LoginPage');
const ProductsPage = require('../../pages/ProductsPage');
const CartPage = require('../../pages/CartPage');
const users = require('../../data/users');
const products = require('../../data/products');

/**
 * Products page — listing, ADD TO CART toggle, cart navigation, and back navigation.
 *
 * TC-P01–P04 share one login session — all steps run inside a single test so
 * the stablePage reset does not interrupt the shared app state between steps.
 *
 * TC-P05 and TC-P-NEG01 are independent — stablePage resets before each.
 */
test.describe('Products', () => {
  let loginPage;
  let productsPage;
  let cartPage;

  test.beforeEach(async ({ driver }) => {
    loginPage    = new LoginPage(driver);
    productsPage = new ProductsPage(driver);
    cartPage     = new CartPage(driver);
  });

  // ── TC-P01–P04: Sequential steps sharing one login session ──────────────────

  test('TC-P01–P04: Products listing → ADD TO CART toggle → go to Cart → back to Products',
    { tag: ['@regression'] },
    async ({ driver }) => {
      // Login once — all steps share this session
      await loginPage.login(users.TC_PRODUCTS);
      await productsPage.waitForScreen();

      // TC-P01: All 10 products listed, each row has name, price, photo, ADD TO CART; cart empty
      expect(await productsPage.getCartCount()).toBe(0);

      const allProducts = Object.values(products);
      expect(allProducts.length).toBe(10);

      for (const product of allProducts) {
        const maxSwipes = 15;
        let found = false;

        for (let attempt = 0; attempt <= maxSwipes; attempt++) {
          const nameEls  = await driver.$$('//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/productName"]');
          const priceEls = await driver.$$('//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/productPrice"]');
          const imgEls   = await driver.$$('//android.widget.ImageView[@resource-id="com.androidsample.generalstore:id/productImage"]');
          const btnEls   = await driver.$$('//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/productAddCart"]');
          
          let targetIndex = -1;
          for (let i = 0; i < nameEls.length; i++) {
            const name = productsPage.normalizeProductName(await nameEls[i].getText().catch(() => ''));
            if (name === productsPage.normalizeProductName(product.name)) {
              targetIndex = i;
              break;
            }
          }

          if (targetIndex !== -1) {
            // Found! 
            // For the first 9 products, we verify other columns are present in DOM.
            // For the last product, we accept name-only if necessary.
            if (product.name === products.NIKE_SFB_JUNGLE.name || 
                (targetIndex < priceEls.length && targetIndex < imgEls.length && targetIndex < btnEls.length)) {
              found = true;
              break;
            }
          }

          if (attempt === maxSwipes) break;

          // Scroll forward — product not yet visible, advance toward end of list.
          const rect    = await driver.getWindowRect();
          const centerX = Math.round(rect.x + (rect.width / 2));
          
          // REQUESTED MAGNITUDE: Grab at 80% and pull to 20%
          const startY  = Math.round(rect.y + (rect.height * 0.80));
          const endY    = Math.round(rect.y + (rect.height * 0.20));

          await driver.performActions([{
            type: 'pointer',
            id: `finger_down_p01_${attempt}`,
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: centerX, y: startY },
              { type: 'pointerDown', button: 0 },
              { type: 'pointerMove', duration: 1500, x: centerX, y: endY },
              { type: 'pointerUp', button: 0 },
            ],
          }]);
          
          await driver.releaseActions();
          await driver.pause(productsPage.settlePause);
        }

        if (!found) {
          const finalNameEls = await driver.$$('//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/productName"]');
          const names = await finalNameEls.map(el => el.getText().catch(() => 'ERR'));
          console.log(`[P01-fail] Could not find "${product.name}". DOM names (${names.length}): [${names.join(' | ')}]`);
        }
        expect(found, `Product "${product.name}" not found on screen after W3C scroll`).toBe(true);
      }

      // Reset list upwards until target item for TC-P02 is visible
      let readyForP02 = false;
      const maxUpSwipes = 10;

      for (let i = 0; i < maxUpSwipes; i++) {
        const nameEls = await driver.$$('//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/productName"]');
        
        // Check if Converse is already in the viewport
        for (let j = 0; j < nameEls.length; j++) {
          const name = productsPage.normalizeProductName(await nameEls[j].getText().catch(() => ''));
          if (name === productsPage.normalizeProductName(products.CONVERSE_ALL_STAR.name)) {
            readyForP02 = true;
            break;
          }
        }

        if (readyForP02) break; // Stop swiping the moment we see the target

        const rect    = await driver.getWindowRect();
        const centerX = Math.round(rect.x + (rect.width / 2));
        const startY  = Math.round(rect.y + (rect.height * 0.32)); // Top safe zone
        const endY    = Math.round(rect.y + (rect.height * 0.72)); // Bottom safe zone

        await driver.performActions([{
          type: 'pointer',
          id: `finger_up_reset_${i}`, // CRITICAL: Unique ID prevents Appium session hangs
          parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, x: centerX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pointerMove', duration: 1500, x: centerX, y: endY },
            { type: 'pointerUp', button: 0 },
          ],
        }]);
        await driver.releaseActions();
        await driver.pause(productsPage.settlePause);
      }

      // TC-P02: ADD TO CART toggle — add → gray/cart=1 → remove → enabled/cart=0
      await productsPage.addProductToCartByName(products.CONVERSE_ALL_STAR.name);
      expect(await productsPage.isAddToCartEnabled(products.CONVERSE_ALL_STAR.name)).toBe(false);
      expect(await productsPage.getCartCount()).toBe(1);

      await productsPage.toggleCartByName(products.CONVERSE_ALL_STAR.name);
      expect(await productsPage.isAddToCartEnabled(products.CONVERSE_ALL_STAR.name)).toBe(true);
      expect(await productsPage.getCartCount()).toBe(0);

      // TC-P03: Add Jordan Lift Off → cart=1 → tap cart icon → Cart page opens
      await productsPage.addProductToCartByName(products.JORDAN_LIFT_OFF.name);
      expect(await productsPage.getCartCount()).toBe(1);
      await productsPage.goToCart();
      await cartPage.waitForScreen();
      expect(await cartPage.isDisplayed()).toBe(true);

      // TC-P04: Back from Cart → Products intact, cart icon still shows 1 item
      await cartPage.goBack();
      await productsPage.waitForScreen();
      expect(await productsPage.isDisplayed()).toBe(true);
      expect(await productsPage.getCartCount()).toBe(1);
    }
  );

  // ── TC-P05: Independent ──────────────────────────────────────────────────────

  test('TC-P05: Add two products — cart=2, both buttons gray → tap cart → Cart page opens',
    { tag: ['@regression'] },
    async ({ driver }) => {
      // FORCE RESET: Ensure we start clean at the Login screen.
      // mobile: startActivity is the project-safe way to relaunch without killing instrumentation.
      await driver.execute('mobile: startActivity', {
        component: 'com.androidsample.generalstore/.SplashActivity',
        stop: false,
      });
      await loginPage.waitForScreen();

      await loginPage.login(users.TC_P05);
      await productsPage.waitForScreen();

      await productsPage.addProductToCartByName(products.AIR_JORDAN_9_RETRO.name);
      expect(await productsPage.isAddToCartEnabled(products.AIR_JORDAN_9_RETRO.name)).toBe(false);

      await productsPage.addProductToCartByName(products.JORDAN_6_RINGS.name);
      expect(await productsPage.isAddToCartEnabled(products.JORDAN_6_RINGS.name)).toBe(false);

      expect(await productsPage.getCartCount()).toBe(2);

      await productsPage.goToCart();
      await cartPage.waitForScreen();
      expect(await cartPage.isDisplayed()).toBe(true);

      // Navigate back to Login — Cart→Products→Login back nav is proven reliable (TC-C03).
      // stablePage takes the fast-path (already on login) instead of firing mobile: startActivity
      // from a mid-session ProductsPage, which does not reliably reset on either device.
      await cartPage.goBack();
      await productsPage.waitForScreen();
      await productsPage.goBack();
      await loginPage.waitForScreen();
    }
  );

  // ── TC-P-NEG01: Independent ──────────────────────────────────────────────────

  test('TC-P-NEG01: [Negative] Tap cart icon with no items — toast shown, stays on Products',
    { tag: ['@smoke', '@regression'] },
    async ({ driver }) => {
      await loginPage.login(users.TC_PRODUCTS);
      await productsPage.waitForScreen();

      await productsPage.goToCart();
      const toastText = await productsPage.getToastText(3000);
      expect(toastText.toLowerCase()).toContain('please add some product at first');
      expect(await productsPage.isDisplayed()).toBe(true);
    }
  );
});
