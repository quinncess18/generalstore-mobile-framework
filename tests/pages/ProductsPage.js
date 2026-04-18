// @ts-check

/**
 * ProductsPage — Page Object Model for the General Store products list screen.
 *
 * Screen elements (confirmed via uiautomator dump):
 *  - Toolbar back button:  appbar_btn_back  (ImageButton)
 *  - Toolbar title:        toolbar_title    (text "Products")
 *  - Cart icon:            appbar_btn_cart  (ImageButton)
 *  - Product list:         rvProductList    (android.support.v7.widget.RecyclerView)
 *    Each row:
 *    • productImage   (ImageView)
 *    • productName    (TextView)
 *    • productPrice   (TextView)
 *    • productAddCart (TextView, clickable=true)
 */
class ProductsPage {
  /**
   * @param {import('webdriverio').Browser} driver
   */
  constructor(driver) {
    this.driver = driver;

    // Device profile — attached by appFixture after session creation.
    // Provides scroll tuning values without device-name string matching.
    // Falls back to conservative defaults so the class works even without a profile
    // (e.g. unit tests or direct driver construction outside the fixture chain).
    const profile = /** @type {any} */ (driver)._deviceProfile || {};
    this.scrollPercent = profile.scrollPercent ?? 0.10;
    this.settlePause   = profile.settlePause   ?? 500;

    // ── Selectors ──────────────────────────────────────────────────────────

    this.productList =
      '//android.support.v7.widget.RecyclerView[@resource-id="com.androidsample.generalstore:id/rvProductList"]';

    this.productName =
      '//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/productName"]';

    this.productPrice =
      '//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/productPrice"]';

    // Confirmed resource-id: productAddCart (not addCart)
    this.addToCart =
      '//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/productAddCart"]';

    this.cartIcon =
      '//android.widget.ImageButton[@resource-id="com.androidsample.generalstore:id/appbar_btn_cart"]';

    this.backButton =
      '//android.widget.ImageButton[@resource-id="com.androidsample.generalstore:id/appbar_btn_back"]';

    // Cart badge — TextView showing item count in cart
    this.cartBadge =
      '//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/counterText"]';

    // Toast — fires when cart icon is tapped with no items
    this.toastMessage =
      '//android.widget.Toast';

    // UiScrollable: scroll product RecyclerView to a product by name, then return it
    /** @type {(productName: string) => string} */
    this.productByName = (productName) =>
      `android=new UiScrollable(new UiSelector().resourceId("com.androidsample.generalstore:id/rvProductList")).scrollIntoView(new UiSelector().text("${productName}").resourceId("com.androidsample.generalstore:id/productName"))`;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get cartIconEl()   { return this.driver.$(this.cartIcon); }
  get backButtonEl() { return this.driver.$(this.backButton); }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Wait for the products list to be visible.
   */
  async waitForScreen() {
    await this.driver.waitUntil(
      async () => {
        const list = await this.driver.$(this.productList);
        return list.isDisplayed();
      },
      { timeout: 15000, timeoutMsg: 'ProductsPage: product list not visible after 15 s' }
    );
  }

  async getAllProductNameElements() {
    return this.driver.$$(this.productName);
  }

  async getAllProductPriceElements() {
    return this.driver.$$(this.productPrice);
  }

  async getAllAddToCartElements() {
    return this.driver.$$(this.addToCart);
  }

  /**
   * @returns {Promise<string[]>}
   */
  async getProductNames() {
    const els = await this.getAllProductNameElements();
    return els.map((el) => el.getText());
  }

  /**
   * @returns {Promise<string[]>}
   */
  async getProductPrices() {
    const els = await this.getAllProductPriceElements();
    return els.map((el) => el.getText());
  }


  /**
   * Normalizes product names across devices (handles trailing/multiple spaces).
   * @param {string} text
   * @returns {string}
   */
  normalizeProductName(text) {
    return String(text).replace(/\s+/g, ' ').trim();
  }

/**
 * Scroll to a product by name and return its price text (e.g. "$ 280.97").
 * Uses W3C actions with a slow center drag to avoid fling inertia variance.
 * @param {string} productName  Exact product name text
 * @returns {Promise<string>}
 */
async getProductPriceByName(productName) {
  await this.driver.pause(this.settlePause);
  const normalizedTarget = this.normalizeProductName(productName);
  const maxSwipes = 8;

  for (let attempt = 0; attempt <= maxSwipes; attempt++) {
    // 1. Fetch current DOM arrays
    const nameEls = await this.driver.$$(this.productName);
    const priceEls = await this.driver.$$(this.productPrice);

    // 2. Trim-to-min guard (The OnePlus Asymmetric Buffer Fix)
    const limit = Math.min(nameEls.length, priceEls.length);

    // 3. Evaluate visible rows
    for (let i = 0; i < limit; i++) {
      const rawName = await nameEls[i].getText().catch(() => '');
      const name = this.normalizeProductName(rawName);

      if (name === normalizedTarget) {
        const priceText = await priceEls[i].getText().catch(() => '');
        if (priceText.trim()) {
          console.log(`[Diagnostic] Found '${normalizedTarget}' at row ${i}. Price: ${priceText}`);
          return priceText;
        }
      }
    }

    // 4. Not found? Execute the W3C slow-scroll (The Xiaomi Inertia Fix)
    if (attempt === maxSwipes) break;

    console.log(`[Diagnostic] '${normalizedTarget}' not visible. W3C swipe ${attempt + 1}/${maxSwipes}`);
    
    const rect = await this.driver.getWindowRect();
    const centerX = Math.round(rect.x + (rect.width / 2));
    // Drag strictly from 72% down to 32% (Center-bound, edge-safe)
    const startY = Math.round(rect.y + (rect.height * 0.72));
    const endY = Math.round(rect.y + (rect.height * 0.32));

    await this.driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: centerX, y: startY },
          { type: 'pointerDown', button: 0 },
          // 1500ms duration kills the physics engine inertia
          { type: 'pointerMove', duration: 1500, x: centerX, y: endY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    
    await this.driver.releaseActions();
    await this.driver.pause(this.settlePause);
  }

  throw new Error(`ProductsPage: price not found for "${productName}" after controlled center swipes`);
}

  /**
 * Scroll to a product by name and tap its ADD TO CART button.
 * Uses the exact same W3C + Trim-to-Min architecture as the price fetcher.
 * @param {string} targetProduct
 */
  async addProductToCartByName(targetProduct) {
    await this.driver.pause(this.settlePause);
    const normalizedTarget = this.normalizeProductName(targetProduct);
    const maxSwipes = 8;

    for (let attempt = 0; attempt <= maxSwipes; attempt++) {
        // 1. Fetch current DOM arrays
        const nameEls = await this.driver.$$(this.productName);
        const addBtns = await this.driver.$$('//*[@resource-id="com.androidsample.generalstore:id/productAddCart"]');

        // 2. Trim-to-min guard (Handles partial rows at screen edges)
        const limit = Math.min(nameEls.length, addBtns.length);

        // 3. Evaluate visible rows
        for (let i = 0; i < limit; i++) {
            const rawName = await nameEls[i].getText().catch(() => '');
            const name = this.normalizeProductName(rawName);

            if (name === normalizedTarget) {
                const btnText = await addBtns[i].getText().catch(() => '');
                // Ensure we only click it if it hasn't been added yet
                if (btnText.toUpperCase() === 'ADD TO CART') {
                    console.log(`[Diagnostic] Clicking ADD TO CART for '${normalizedTarget}' at row ${i}`);
                    await addBtns[i].click();
                    return;
                }
            }
        }

        // 4. Not found? Execute the W3C slow-scroll
        if (attempt === maxSwipes) break;

        console.log(`[Diagnostic] '${normalizedTarget}' ADD TO CART not visible. W3C swipe ${attempt + 1}/${maxSwipes}`);
        
        const rect = await this.driver.getWindowRect();
        const centerX = Math.round(rect.x + (rect.width / 2));
        const startY = Math.round(rect.y + (rect.height * 0.72));
        const endY = Math.round(rect.y + (rect.height * 0.32));

        await this.driver.performActions([
            {
                type: 'pointer',
                id: 'finger2', // Different pointer ID to prevent conflicts
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: centerX, y: startY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pointerMove', duration: 1500, x: centerX, y: endY },
                    { type: 'pointerUp', button: 0 },
                ],
            },
        ]);
        
        await this.driver.releaseActions();
        await this.driver.pause(this.settlePause);
    }

    throw new Error(`ProductsPage: ADD TO CART button not found for "${targetProduct}" after controlled swipes.`);
}

/**
   * Toggles a product in/out of the cart by name.
   * State-agnostic: It clicks the button unconditionally, ignoring the button's text/state.
   * Uses the same W3C + Trim-to-Min architecture as the add method.
   * @param {string} targetProduct
   */
  async toggleCartByName(targetProduct) {
    await this.driver.pause(this.settlePause);
    const normalizedTarget = this.normalizeProductName(targetProduct);
    const maxSwipes = 8;

    for (let attempt = 0; attempt <= maxSwipes; attempt++) {
        // 1. Fetch current DOM arrays
        const nameEls = await this.driver.$$(this.productName);
        const addBtns = await this.driver.$$('//*[@resource-id="com.androidsample.generalstore:id/productAddCart"]');

        // 2. Trim-to-min guard (Handles partial rows at screen edges)
        const limit = Math.min(nameEls.length, addBtns.length);

        // 3. Evaluate visible rows
        for (let i = 0; i < limit; i++) {
            const rawName = await nameEls[i].getText().catch(() => '');
            const name = this.normalizeProductName(rawName);

            if (name === normalizedTarget) {
                console.log(`[Diagnostic] Toggling cart state for '${normalizedTarget}' at row ${i}`);
                // Unconditional click: bypasses the 'ADD TO CART' text check
                await addBtns[i].click();
                return;
            }
        }

        // 4. Not found? Execute the W3C slow-scroll
        if (attempt === maxSwipes) break;

        console.log(`[Diagnostic] '${normalizedTarget}' not visible for toggle. W3C swipe ${attempt + 1}/${maxSwipes}`);
        
        const rect = await this.driver.getWindowRect();
        const centerX = Math.round(rect.x + (rect.width / 2));
        const startY = Math.round(rect.y + (rect.height * 0.72));
        const endY = Math.round(rect.y + (rect.height * 0.32));

        await this.driver.performActions([
            {
                type: 'pointer',
                id: `finger_toggle_${attempt}`, // Unique ID for toggle actions
                parameters: { pointerType: 'touch' },
                actions: [
                    { type: 'pointerMove', duration: 0, x: centerX, y: startY },
                    { type: 'pointerDown', button: 0 },
                    { type: 'pointerMove', duration: 1500, x: centerX, y: endY },
                    { type: 'pointerUp', button: 0 },
                ],
            },
        ]);
        
        await this.driver.releaseActions();
        await this.driver.pause(this.settlePause);
    }

    throw new Error(`ProductsPage: Container for "${targetProduct}" not found to toggle cart.`);
  }

  /**
   * Tap the cart icon in the toolbar to navigate to the cart screen.
   */
  async goToCart() {
    const icon = await this.cartIconEl;
    await icon.waitForDisplayed({ timeout: 5000 });
    await icon.click();
  }

  /**
   * Tap the back arrow to return to the login screen.
   */
  async goBack() {
    const btn = await this.backButtonEl;
    await btn.waitForDisplayed({ timeout: 5000 });
    await btn.click();
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async isDisplayed() {
    const list = await this.driver.$(this.productList);
    return list.isDisplayed();
  }

  async getVisibleProductCount() {
    const els = await this.getAllProductNameElements();
    return els.length;
  }

  /**
   * Returns the cart item count shown on the toolbar badge.
   * Returns 0 if the badge is not displayed (empty cart).
   * @returns {Promise<number>}
   */
  async getCartCount() {
    try {
      const badge = await this.driver.$(this.cartBadge);
      const displayed = await badge.isDisplayed().catch(() => false);
      if (!displayed) return 0;
      const text = await badge.getText().catch(() => '0');
      return parseInt(text, 10) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Returns true if the ADD TO CART button for the given product is enabled (clickable).
   * A gray/disabled button means the product is already in the cart.
   * @param {string} productName  Exact product name text
   * @returns {Promise<boolean>}
   */
  async isAddToCartEnabled(productName) {
    const nameEls = await this.driver.$$(this.productName);
    const addBtns = await this.driver.$$(this.addToCart);
    const limit   = Math.min(nameEls.length, addBtns.length);
    for (let i = 0; i < limit; i++) {
      if (this.normalizeProductName(await nameEls[i].getText().catch(() => '')) === this.normalizeProductName(productName)) {
        const btnText = await addBtns[i].getText().catch(() => '');
        return btnText.toUpperCase() === 'ADD TO CART';
      }
    }
    throw new Error(`ProductsPage: ADD TO CART button not found for "${productName}"`);
  }

  /**
   * Waits for and returns the text of a Toast notification.
   * @param {number} [timeout=3000]
   * @returns {Promise<string>}
   */
  async getToastText(timeout = 3000) {
    try {
      const toast = await this.driver.$(this.toastMessage);
      await toast.waitForExist({ timeout });
      return toast.getText();
    } catch {
      return '';
    }
  }
}

module.exports = ProductsPage;
