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
  const maxSwipes = 15;

  for (let attempt = 0; attempt <= maxSwipes; attempt++) {
  // 1. Fetch current DOM arrays
  const nameEls = await this.driver.$$(this.productName);
  const priceEls = await this.driver.$$(this.productPrice);

  // 2. Evaluate visible rows using Y-coordinate matching
  for (const nameEl of nameEls) {
    const rawName = await nameEl.getText().catch(() => '');
    const name = this.normalizeProductName(rawName);

    if (name === normalizedTarget) {
      const nameRect = await nameEl.getLocation();

      // Find the closest price element by Y coordinate
      let bestPriceEl = null;
      let minDiff = Infinity;
      for (const priceEl of priceEls) {
          const priceRect = await priceEl.getLocation().catch(() => ({ y: Infinity }));
          const diff = Math.abs(priceRect.y - nameRect.y);
          if (diff < minDiff) {
              minDiff = diff;
              bestPriceEl = priceEl;
          }
      }

      if (bestPriceEl && minDiff < 300) {
          const priceText = await bestPriceEl.getText().catch(() => '');
          if (priceText.trim()) {
              console.log(`[Diagnostic] Found '${normalizedTarget}'. Price: ${priceText}`);
              return priceText;
          }
      }
    }
  }

  // 4. Not found? Execute the W3C slow-scroll (The Xiaomi Inertia Fix)    if (attempt === maxSwipes) break;

    console.log(`[Diagnostic] '${normalizedTarget}' not visible. W3C swipe ${attempt + 1}/${maxSwipes}`);
    
    const rect = await this.driver.getWindowRect();
    const centerX = Math.round(rect.x + (rect.width / 2));
    // Drag strictly from 72% down to 32% (Center-bound, edge-safe)
    const startY = Math.round(rect.y + (rect.height * 0.72));
    const endY = Math.round(rect.y + (rect.height * 0.32));

    // Use gentler W3C pointer actions for emulator compatibility
    // Shorter distance, slower speed, more pauses
    await this.driver.performActions([{
      type: 'pointer',
      id: 'finger1', // Static ID to prevent pointer exhaustion
      parameters: { pointerType: 'touch' },
      actions: [
        // Move to start position
        { type: 'pointerMove', duration: 0, x: centerX, y: startY },
        // Press down
        { type: 'pointerDown', button: 0 },
        // Very slow drag (2000ms) with shorter distance (40% of original)
        { type: 'pointerMove', duration: 2000, x: centerX, y: Math.round(startY - (startY-endY)*0.4) },
        // Release
        { type: 'pointerUp', button: 0 },
      ],
    }]);
    
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
    const maxSwipes = 15;

    for (let attempt = 0; attempt <= maxSwipes; attempt++) {
        // 1. Fetch current DOM arrays
        const nameEls = await this.driver.$$(this.productName);
        const addBtns = await this.driver.$$('//*[@resource-id="com.androidsample.generalstore:id/productAddCart"]');

        // 2. Evaluate visible rows using Y-coordinate matching
        for (const nameEl of nameEls) {
            const rawName = await nameEl.getText().catch(() => '');
            const name = this.normalizeProductName(rawName);

            if (name === normalizedTarget) {
                const nameRect = await nameEl.getLocation();

                // Find the closest add button by Y coordinate
                let bestBtn = null;
                let minDiff = Infinity;
                for (const addBtn of addBtns) {
                    const btnRect = await addBtn.getLocation().catch(() => ({ y: Infinity }));
                    const diff = Math.abs(btnRect.y - nameRect.y);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestBtn = addBtn;
                    }
                }

                if (bestBtn && minDiff < 300) {
                    const btnText = await bestBtn.getText().catch(() => '');
                    // Ensure we only click it if it hasn't been added yet
                    if (btnText.toUpperCase() === 'ADD TO CART') {
                        console.log(`[Diagnostic] Clicking ADD TO CART for '${normalizedTarget}'`);
                        await bestBtn.click();
                        // Add stabilization pause to let UI update before continuing
                        await this.driver.pause(800);
                        return;
                    }
                }
            }
        }

        // 4. Not found? Execute gentle W3C scroll (more compatible with emulators)
        if (attempt === maxSwipes) break;

        console.log(`[Diagnostic] '${normalizedTarget}' ADD TO CART not visible. Gentle W3C scroll ${attempt + 1}/${maxSwipes}`);
        
        const rect = await this.driver.getWindowRect();
        const startY = Math.round(rect.y + (rect.height * 0.62));

        // Use gentler W3C pointer actions for emulator compatibility
        // Shorter distance, slower speed, more pauses
        await this.driver.performActions([{
            type: 'pointer',
            id: 'finger1', // Static ID to prevent pointer exhaustion
            parameters: { pointerType: 'touch' },
            actions: [
                // Move to start position
                { type: 'pointerMove', duration: 0, x: centerX, y: startY },
                // Press down
                { type: 'pointerDown', button: 0 },
                // Very slow drag (2000ms) with shorter distance (40% of original)
                { type: 'pointerMove', duration: 2000, x: centerX, y: Math.round(startY - (startY-endY)*0.4) },
                // Release
                { type: 'pointerUp', button: 0 },
            ],
        }]);
        
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
    const maxSwipes = 15;

    for (let attempt = 0; attempt <= maxSwipes; attempt++) {
        // 1. Fetch current DOM arrays
        const nameEls = await this.driver.$$(this.productName);
        const addBtns = await this.driver.$$('//*[@resource-id="com.androidsample.generalstore:id/productAddCart"]');

        // 2. Evaluate visible rows using Y-coordinate matching
        for (const nameEl of nameEls) {
            const rawName = await nameEl.getText().catch(() => '');
            const name = this.normalizeProductName(rawName);

            if (name === normalizedTarget) {
                const nameRect = await nameEl.getLocation();

                // Find the closest add button by Y coordinate
                let bestBtn = null;
                let minDiff = Infinity;
                for (const addBtn of addBtns) {
                    const btnRect = await addBtn.getLocation().catch(() => ({ y: Infinity }));
                    const diff = Math.abs(btnRect.y - nameRect.y);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestBtn = addBtn;
                    }
                }

                if (bestBtn && minDiff < 300) {
                    console.log(`[Diagnostic] Toggling cart state for '${normalizedTarget}'`);
                    // Unconditional click: bypasses the 'ADD TO CART' text check
                    await bestBtn.click();
                    // Add stabilization pause to let UI update before continuing
                    await this.driver.pause(800);
                    return;
                }
            }
        }

        // 4. Not found? Execute gentle W3C scroll (more compatible with emulators)
        if (attempt === maxSwipes) break;

        console.log(`[Diagnostic] '${normalizedTarget}' not visible for toggle. Gentle W3C scroll ${attempt + 1}/${maxSwipes}`);
        
        const rect = await this.driver.getWindowRect();
        const startY = Math.round(rect.y + (rect.height * 0.62));

        // Use more reliable mobile: scrollGesture instead of W3C pointer actions
        // This avoids InteractionController issues in emulator environments
        await this.driver.execute('mobile: scrollGesture', {
            left: Math.round(rect.width * 0.3),
            top: Math.round(startY), 
            width: Math.round(rect.width * 0.4),
            height: Math.round(rect.height * 0.1),
            direction: 'up',
            percent: 0.7,
        });
        
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
    const normalizedTarget = this.normalizeProductName(productName);

    for (const nameEl of nameEls) {
      const rawName = await nameEl.getText().catch(() => '');
      if (this.normalizeProductName(rawName) === normalizedTarget) {
        const nameRect = await nameEl.getLocation();
        
        let bestBtn = null;
        let minDiff = Infinity;
        for (const addBtn of addBtns) {
            const btnRect = await addBtn.getLocation().catch(() => ({ y: Infinity }));
            const diff = Math.abs(btnRect.y - nameRect.y);
            if (diff < minDiff) {
                minDiff = diff;
                bestBtn = addBtn;
            }
        }

        if (bestBtn && minDiff < 300) {
            const btnText = await bestBtn.getText().catch(() => '');
            return btnText.toUpperCase() === 'ADD TO CART';
        }
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
 ProductsPage;
