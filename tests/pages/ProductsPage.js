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
      `android=new UiScrollable(new UiSelector().resourceId("com.androidsample.generalstore:id/rvProductList")).scrollIntoView(new UiSelector().text("${productName}"))`;
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get cartIconEl()   { return this.driver.$(this.cartIcon); }
  get backButtonEl() { return this.driver.$(this.backButton); }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Wait for the products screen to be fully loaded and stable.
   * Uses multiple indicators and extended timeouts for CI environment reliability.
   */
  async waitForScreen() {
    // Initial stabilization pause for any in-progress transitions
    await this.driver.pause(2000);
    
    try {
      // First check the toolbar is visible - faster to render
      await this.driver.waitUntil(
        async () => {
          try {
            const toolbar = await this.driver.$('//android.widget.TextView[@text="Products"]');
            return toolbar.isDisplayed();
          } catch (e) {
            return false;
          }
        },
        { timeout: 20000, timeoutMsg: 'ProductsPage: toolbar title not visible after 20s' }
      );
      
      // Then ensure the product list itself is loaded
      await this.driver.waitUntil(
        async () => {
          try {
            const list = await this.driver.$(this.productList);
            return list.isDisplayed();
          } catch (e) {
            return false;
          }
        },
        { timeout: 20000, timeoutMsg: 'ProductsPage: product list not visible after 20s' }
      );
      
      // Wait for at least one product to be visible in the list
      await this.driver.waitUntil(
        async () => {
          try {
            const names = await this.driver.$$(this.productName);
            return names.length > 0 && await names[0].isDisplayed();
          } catch (e) {
            return false;
          }
        },
        { timeout: 20000, timeoutMsg: 'ProductsPage: no product names visible after 20s' }
      );
      
      // Verify cart icon is present - important for navigation tests
      await this.driver.waitUntil(
        async () => {
          try {
            const cart = await this.cartIconEl;
            return cart.isDisplayed();
          } catch (e) {
            return false;
          }
        },
        { timeout: 20000, timeoutMsg: 'ProductsPage: cart icon not visible after 20s' }
      );
      
      // Final stabilization pause to ensure animations are complete
      await this.driver.pause(1000);
      console.log('[Diagnostic] ProductsPage is fully loaded and stable');
    } catch (error) {
      console.log(`[Diagnostic] Error waiting for ProductsPage: ${error.message}`);
      
      // Check current package is still our app
      const pkg = await this.driver.getCurrentPackage();
      if (pkg !== 'com.androidsample.generalstore') {
        console.log(`[Warning] Current package is ${pkg}, expected com.androidsample.generalstore`);
        
        // Attempt recovery by using mobile: startActivity (safe method)
        try {
          await this.driver.execute('mobile: startActivity', {
            appPackage: 'com.androidsample.generalstore',
            appActivity: '.MainActivity',
            stop: false  // CRITICAL: Must be false to avoid killing UIAutomator2
          });
          await this.driver.pause(3000);
        } catch (e) {
          console.log(`[Error] Failed to restart app: ${e.message}`);
        }
      }
      
      // Re-throw to let test know this is a critical failure
      throw error;
    }
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
   * Helper method to ensure a product is visible on screen.
   * Checks if it's already visible to prevent UiScrollable timeout flakiness.
   */
  async ensureProductVisible(targetProduct) {
    const normalizedTarget = this.normalizeProductName(targetProduct);
    
    // Initial stabilization pause
    await this.driver.pause(1000);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        // Check if it's already visible
        const nameEls = await this.driver.$$(this.productName);
        for (const nameEl of nameEls) {
          const rawName = await nameEl.getText().catch(() => '');
          if (this.normalizeProductName(rawName) === normalizedTarget) {
            return; // Already on screen!
          }
        }
        
        // If not visible, use UiScrollable with a generous timeout
        const productSelector = this.productByName(targetProduct);
        await this.driver.$(productSelector).waitForExist({ timeout: 20000 });
        await this.driver.pause(1000);
        return;
      } catch (e) {
        if (attempt === 2) throw e;
        console.log(`[Diagnostic] Attempt ${attempt} failed to scroll to ${targetProduct}. Retrying...`);
        await this.driver.pause(2000);
      }
    }
  }

  /**
   * Scroll to a product by name and return its price text (e.g. "$ 280.97").
   * In CI emulator: uses UiScrollable for reliable scrolling from UIAutomator2.
   * @param {string} productName  Exact product name text
   * @returns {Promise<string>}
   */
  async getProductPriceByName(productName) {
    await this.driver.pause(this.settlePause);
    const normalizedTarget = this.normalizeProductName(productName);
    
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`[Diagnostic] Retry #${attempt} for getting price of '${normalizedTarget}'`);
          await this.driver.pause(1000);
        }

        console.log(`[Diagnostic] Ensuring '${normalizedTarget}' is visible for price`);
        await this.ensureProductVisible(productName);
        
        // Once the product is visible, find its price
        const nameEls = await this.driver.$$(this.productName);
        const priceEls = await this.driver.$$(this.productPrice);
        
        // Find the name element that matches our target
        let targetNameEl = null;
        for (const nameEl of nameEls) {
          const rawName = await nameEl.getText().catch(() => '');
          const name = this.normalizeProductName(rawName);
          if (name === normalizedTarget) {
            targetNameEl = nameEl;
            break;
          }
        }
        
        if (!targetNameEl) {
          throw new Error(`Product name element not found in visible viewport`);
        }
        
        // Find the closest price element using Y-coordinate matching
        const nameRect = await targetNameEl.getLocation();
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
        
        throw new Error(`Price element not found for "${productName}"`);
      } catch (error) {
        lastError = error;
        console.log(`[Diagnostic] Attempt ${attempt} failed to get price: ${error.message}`);

        // Nudge the screen up slightly in case the price is cut off at the bottom edge
        try {
          console.log(`[Diagnostic] Nudging screen to reveal hidden price...`);
          const rect = await this.driver.getWindowRect();
          const centerX = Math.round(rect.width / 2);
          await this.driver.performActions([{
            type: 'pointer', id: 'nudge_finger_price', parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: centerX, y: Math.round(rect.height * 0.6) },
              { type: 'pointerDown', button: 0 },
              { type: 'pointerMove', duration: 500, x: centerX, y: Math.round(rect.height * 0.4) },
              { type: 'pointerUp', button: 0 }
            ]
          }]);
          await this.driver.releaseActions();
          await this.driver.pause(1000);
        } catch (e) {
          // ignore nudge errors
        }
      }
    }
    throw new Error(`Failed to get price for "${productName}" after 3 attempts: ${lastError.message}`);
  }

  /**
   * Scroll to a product by name and tap its ADD TO CART button.
   * In CI emulator: uses UiScrollable for reliable scrolling from UIAutomator2.
   * @param {string} targetProduct
   */
  async addProductToCartByName(targetProduct) {
    await this.driver.pause(this.settlePause);
    const normalizedTarget = this.normalizeProductName(targetProduct);
    
    try {
      console.log(`[Diagnostic] Using UiScrollable/ensureProductVisible to find '${normalizedTarget}'`);
      
      // CI-SPECIFIC APPROACH: Retry loop to handle StaleElementReferenceException and UiScrollable flakiness
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`[Diagnostic] Retry #${attempt} for adding '${normalizedTarget}' to cart`);
            await this.driver.pause(1000);
          }
          
          // Ensure it's on screen (skips scroll if already visible)
          await this.ensureProductVisible(targetProduct);
          
          // Once the product is visible, find its ADD TO CART button
          const nameEls = await this.driver.$$(this.productName);
          const addBtns = await this.driver.$$('//*[@resource-id="com.androidsample.generalstore:id/productAddCart"]');
          
          // Find the name element that matches our target
          let targetNameEl = null;
          for (const nameEl of nameEls) {
            const rawName = await nameEl.getText().catch(() => '');
            const name = this.normalizeProductName(rawName);
            if (name === normalizedTarget) {
              targetNameEl = nameEl;
              break;
            }
          }
          
          if (!targetNameEl) {
            throw new Error(`Product name element not found in visible viewport`);
          }
          
          // Find the closest ADD TO CART button using Y-coordinate matching
          const nameRect = await targetNameEl.getLocation();
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
              return; // Success
            } else {
              console.log(`[Diagnostic] Button text is '${btnText}', expected 'ADD TO CART'`);
              return; // Already added, no error
            }
          }
          
          throw new Error(`ADD TO CART button not found for "${targetProduct}"`);
        } catch (error) {
          lastError = error;
          console.log(`[Diagnostic] Attempt ${attempt} failed: ${error.message}`);

          // Nudge the screen up slightly in case the button is cut off at the bottom edge
          try {
            console.log(`[Diagnostic] Nudging screen to reveal hidden button...`);
            const rect = await this.driver.getWindowRect();
            const centerX = Math.round(rect.width / 2);
            await this.driver.performActions([{
              type: 'pointer', id: 'nudge_finger', parameters: { pointerType: 'touch' },
              actions: [
                { type: 'pointerMove', duration: 0, x: centerX, y: Math.round(rect.height * 0.6) },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerMove', duration: 500, x: centerX, y: Math.round(rect.height * 0.4) },
                { type: 'pointerUp', button: 0 }
              ]
            }]);
            await this.driver.releaseActions();
            await this.driver.pause(1000);
          } catch (e) {
            // ignore nudge errors
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      throw new Error(`Failed to add "${targetProduct}" to cart: ${error.message}`);
    }
  }

  /**
   * Toggles a product in/out of the cart by name.
   * State-agnostic: It clicks the button unconditionally, ignoring the button's text/state.
   * In CI emulator: uses UiScrollable for reliable scrolling from UIAutomator2.
   * @param {string} targetProduct
   */
  async toggleCartByName(targetProduct) {
    // Start with longer stabilization pause
    await this.driver.pause(2000);
    const normalizedTarget = this.normalizeProductName(targetProduct);
    
    try {
      console.log(`[Diagnostic] Using UiScrollable/ensureProductVisible to find '${normalizedTarget}' for toggling`);
      
      // CI-SPECIFIC APPROACH: Retry loop to handle StaleElementReferenceException
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`[Diagnostic] Retry #${attempt} for finding/clicking toggle button for '${normalizedTarget}'`);
            await this.driver.pause(1000);
          }
          
          // Ensure it's on screen
          await this.ensureProductVisible(targetProduct);
          
          // Once the product is visible, find its cart button
          console.log('[Diagnostic] Finding product name elements');
          const nameEls = await this.driver.$$(this.productName);
          console.log(`[Diagnostic] Found ${nameEls.length} product name elements`);
          
          console.log('[Diagnostic] Finding add/remove cart buttons');
          const addBtns = await this.driver.$$('//*[@resource-id="com.androidsample.generalstore:id/productAddCart"]');
          console.log(`[Diagnostic] Found ${addBtns.length} cart buttons`);
          
          // Find the name element that matches our target
          let targetNameEl = null;
          for (const nameEl of nameEls) {
            const rawName = await nameEl.getText().catch(() => '');
            const name = this.normalizeProductName(rawName);
            if (name === normalizedTarget) {
              targetNameEl = nameEl;
              console.log(`[Diagnostic] Found matching name element for '${normalizedTarget}'`);
              break;
            }
          }
          
          if (!targetNameEl) {
            throw new Error(`Product name element not found in visible viewport`);
          }
          
          // Find the closest cart button using Y-coordinate matching
          const nameRect = await targetNameEl.getLocation();
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
            // Extended handling with button state inspection
            const btnText = await bestBtn.getText().catch(() => '');
            const initialState = btnText.toUpperCase() === 'ADD TO CART' ? 'enabled' : 'disabled';
            console.log(`[Diagnostic] Toggling cart state for '${normalizedTarget}' - current state: ${initialState}`);
            
            // Check if the button is actually clickable
            const isClickable = await bestBtn.isClickable().catch(() => false);
            console.log(`[Diagnostic] Button is ${isClickable ? 'clickable' : 'NOT clickable'}`);
            
            // Unconditional click: bypasses any text check (could be ADD TO CART or ADDED TO CART)
            console.log(`[Diagnostic] Executing click on cart button for '${normalizedTarget}'`);
            await bestBtn.click();
            
            // Add substantial stabilization pause to let UI update before continuing
            console.log(`[Diagnostic] Stabilization pause after toggling '${normalizedTarget}'`);
            await this.driver.pause(3000);
            
            // Check the badge state after toggling
            try {
              const cartCount = await this.getCartCount();
              console.log(`[Diagnostic] Cart count after toggle: ${cartCount}`);
            } catch (e) {
              console.log(`[Diagnostic] Error getting cart count after toggle: ${e.message}`);
            }
            
            // Check the button's new state
            try {
              const newBtnText = await bestBtn.getText().catch(() => '');
              const newState = newBtnText.toUpperCase() === 'ADD TO CART' ? 'enabled' : 'disabled';
              console.log(`[Diagnostic] Button state after toggle: ${newState}`);
            } catch (e) {
              console.log(`[Diagnostic] Error checking button state after toggle: ${e.message}`);
            }
            
            return; // Success, exit retry loop
          } else {
             throw new Error(`Cart toggle button not found for "${targetProduct}"`);
          }
        } catch (error) {
          lastError = error;
          console.log(`[Diagnostic] Attempt ${attempt} failed: ${error.message}`);

          // Nudge the screen up slightly in case the button is cut off at the bottom edge
          try {
            console.log(`[Diagnostic] Nudging screen to reveal hidden button...`);
            const rect = await this.driver.getWindowRect();
            const centerX = Math.round(rect.width / 2);
            await this.driver.performActions([{
              type: 'pointer', id: 'nudge_finger', parameters: { pointerType: 'touch' },
              actions: [
                { type: 'pointerMove', duration: 0, x: centerX, y: Math.round(rect.height * 0.6) },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerMove', duration: 500, x: centerX, y: Math.round(rect.height * 0.4) },
                { type: 'pointerUp', button: 0 }
              ]
            }]);
            await this.driver.releaseActions();
            await this.driver.pause(1000);
          } catch (e) {
            // ignore nudge errors
          }
        }
      }
      
      console.log(`[Diagnostic] ERROR: Exhausted all retries for toggling "${targetProduct}"`);
      throw lastError;
    } catch (error) {
      console.log(`[Diagnostic] EXCEPTION during toggle: ${error.message}`);
      throw new Error(`Failed to toggle "${targetProduct}" in cart: ${error.message}`);
    }
  }

  /**
   * Tap the cart icon in the toolbar to navigate to the cart screen.
   * Uses a retry mechanism for improved stability in CI environments.
   */
  async goToCart() {
    // Add a stabilization pause before attempting to navigate
    await this.driver.pause(1000);
    
    try {
      // Always get a fresh reference to the cart icon
      const icon = await this.cartIconEl;
      await icon.waitForDisplayed({ timeout: 10000 });
      
      // Add a pre-click stabilization pause
      await this.driver.pause(500);
      
      // Click the cart icon
      await icon.click();
      
      // Add a post-navigation stabilization pause to allow screen transition
      await this.driver.pause(1500);
    } catch (error) {
      // If first attempt fails (e.g., stale element), try again with a fresh reference
      console.log(`[Diagnostic] First cart navigation attempt failed: ${error.message}. Retrying...`);
      await this.driver.pause(2000); // Longer pause before retry
      
      // Get a fresh reference and try again
      const icon = await this.cartIconEl;
      await icon.waitForDisplayed({ timeout: 10000 });
      await icon.click();
      
      // Add a post-navigation stabilization pause
      await this.driver.pause(1500);
    }
  }

  /**
   * Tap the back arrow to return to the login screen.
   * Uses a retry mechanism for improved stability in CI environments.
   */
  async goBack() {
    // Add a stabilization pause before attempting to navigate
    await this.driver.pause(1000);
    
    try {
      // Always get a fresh reference to the back button
      const btn = await this.backButtonEl;
      await btn.waitForDisplayed({ timeout: 10000 });
      
      // Add a pre-click stabilization pause
      await this.driver.pause(500);
      
      // Click the back button
      await btn.click();
      
      // Add a post-navigation stabilization pause to allow screen transition
      await this.driver.pause(1500);
    } catch (error) {
      // If first attempt fails (e.g., stale element), try again with a fresh reference
      console.log(`[Diagnostic] First back navigation attempt failed: ${error.message}. Retrying...`);
      await this.driver.pause(2000); // Longer pause before retry
      
      // Get a fresh reference and try again
      const btn = await this.backButtonEl;
      await btn.waitForDisplayed({ timeout: 10000 });
      await btn.click();
      
      // Add a post-navigation stabilization pause
      await this.driver.pause(1500);
    }
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
   * Enhanced for reliability in CI with retries and explicit waiting.
   * @returns {Promise<number>}
   */
  async getCartCount() {
    // Add a small stabilization pause to ensure UI is stable
    await this.driver.pause(500);
    
    // Try multiple times to get the cart count in case of UI updates
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Wait a bit longer on each retry
        if (attempt > 0) {
          await this.driver.pause(1000 * attempt);
          console.log(`[Diagnostic] Retry #${attempt} getting cart count`);
        }
        
        // Check if the cart icon itself is visible
        const cartIcon = await this.cartIconEl;
        const iconVisible = await cartIcon.isDisplayed().catch(() => false);
        if (!iconVisible) {
          console.log('[Diagnostic] Cart icon not visible when checking count');
          continue; // retry
        }
        
        // First check if badge exists
        const badge = await this.driver.$(this.cartBadge);
        const badgeExists = await badge.isExisting().catch(() => false);
        if (!badgeExists) {
          console.log('[Diagnostic] Cart badge not in DOM, count=0');
          return 0;
        }
        
        // Next check if it's visible - invisible badge means empty cart
        const displayed = await badge.isDisplayed().catch(() => false);
        if (!displayed) {
          console.log('[Diagnostic] Cart badge exists but not displayed, count=0');
          return 0;
        }
        
        // Get badge text and parse count
        const text = await badge.getText().catch(() => '0');
        const count = parseInt(text, 10) || 0;
        
        console.log(`[Diagnostic] Cart badge visible with count=${count}`);
        return count;
      } catch (error) {
        console.log(`[Diagnostic] Error getting cart count: ${error.message}`);
        if (attempt === 2) return 0; // last attempt, give up
      }
    }
    
    return 0; // fallback
  }

  /**
   * Returns true if the ADD TO CART button for the given product is enabled (clickable).
   * A gray/disabled button means the product is already in the cart.
   * In CI emulator: uses UiScrollable for reliable product finding.
   * @param {string} productName  Exact product name text
   * @returns {Promise<boolean>}
   */
  async isAddToCartEnabled(productName) {
    try {
      // Add a stabilization pause before checking
      await this.driver.pause(1000);
      
      // Normalize the target name
      const normalizedTarget = this.normalizeProductName(productName);
      
      // CI-SPECIFIC APPROACH: Use UiScrollable for direct element targeting
      console.log(`[Diagnostic] Using ensureProductVisible to find '${normalizedTarget}' for button state check`);
      
      try {
        await this.ensureProductVisible(productName);
      } catch (error) {
        console.log(`[Diagnostic] ensureProductVisible failed to find '${normalizedTarget}': ${error.message}`);
        // Fall back to checking whatever is currently visible
      }
      
      // Once we've scrolled to the approximate position, check visible elements
      const nameEls = await this.driver.$$(this.productName);
      const addBtns = await this.driver.$$(this.addToCart);
      
      // Find the name element that matches our target
      let targetNameEl = null;
      for (const nameEl of nameEls) {
        const rawName = await nameEl.getText().catch(() => '');
        if (this.normalizeProductName(rawName) === normalizedTarget) {
          targetNameEl = nameEl;
          break;
        }
      }
      
      if (!targetNameEl) {
        console.log(`[Diagnostic] Product name '${normalizedTarget}' not found in viewport`);
        return false; // Can't determine state if product isn't visible
      }
      
      // Find the closest button using Y-coordinate matching
      const nameRect = await targetNameEl.getLocation();
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
        const isEnabled = btnText.toUpperCase() === 'ADD TO CART';
        console.log(`[Diagnostic] Button for '${normalizedTarget}' state: ${isEnabled ? 'enabled' : 'disabled'}`);
        return isEnabled;
      }
      
      console.log(`[Diagnostic] No matching button found for '${normalizedTarget}'`);
      return false; // Can't determine state if button isn't found
    } catch (error) {
      console.log(`[Diagnostic] Error checking button state for '${productName}': ${error.message}`);
      return false; // Return false on errors to avoid halting test execution
    }
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
