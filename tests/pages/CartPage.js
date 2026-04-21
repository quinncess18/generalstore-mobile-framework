// @ts-check

/**
 * CartPage — Page Object Model for the General Store cart screen.
 *
 * Screen elements (confirmed via uiautomator dump):
 *  - Toolbar back button:  appbar_btn_back   (ImageButton)
 *  - Toolbar title:        toolbar_title     (text "Cart")
 *  - Cart product list:    rvCartProductList (android.support.v7.widget.RecyclerView)
 *    Each row:
 *    • productImage  (ImageView)
 *    • productName   (TextView)
 *    • productPrice  (TextView)
 *  - Bottom bar: bottomBar (LinearLayout) — all elements visible without scrolling
 *    • "Total Purchase Amount:" static label (no resource-id)
 *    • totalAmountLbl  (TextView)  e.g. "$ 280.97"
 *    • CheckBox (no resource-id) — "Send me e-mails on discounts..."
 *    • btnProceed (Button) — "Visit to the website to complete purchase"
 *    • termsButton (TextView) — "Please read our terms of conditions"
 */
class CartPage {
  /**
   * @param {import('webdriverio').Browser} driver
   */
  constructor(driver) {
    this.driver = driver;

    // ── Selectors ──────────────────────────────────────────────────────────

    this.cartList =
      '//android.support.v7.widget.RecyclerView[@resource-id="com.androidsample.generalstore:id/rvCartProductList"]';

    this.cartProductName =
      '//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/productName"]';

    this.cartProductPrice =
      '//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/productPrice"]';

    this.totalAmountLabel =
      '//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/totalAmountLbl"]';

    // Checkbox has no resource-id — matched by class (only one checkbox on screen)
    this.emailCheckbox =
      '//android.widget.CheckBox';

    // Visit website button
    this.visitWebsiteButton =
      '//android.widget.Button[@resource-id="com.androidsample.generalstore:id/btnProceed"]';

    // Terms text has resource-id termsButton
    this.termsText =
      '//android.widget.TextView[@resource-id="com.androidsample.generalstore:id/termsButton"]';

    this.backButton =
      '//android.widget.ImageButton[@resource-id="com.androidsample.generalstore:id/appbar_btn_back"]';
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get totalAmountEl()    { return this.driver.$(this.totalAmountLabel); }
  get emailCheckboxEl()  { return this.driver.$(this.emailCheckbox); }
  get visitWebsiteEl()   { return this.driver.$(this.visitWebsiteButton); }
  get termsTextEl()      { return this.driver.$(this.termsText); }
  get backButtonEl()     { return this.driver.$(this.backButton); }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Wait for the cart screen to be visible.
   */
  async waitForScreen() {
    await this.driver.waitUntil(
      async () => (await this.visitWebsiteEl).isDisplayed(),
      { timeout: 15000, timeoutMsg: 'CartPage: "Visit website" button not visible after 15 s' }
    );
  }

  /**
   * Ensure the email opt-in checkbox is checked or unchecked.
   * All cart elements are visible without scrolling.
   * @param {boolean} [check=true]
   */
  async setEmailOptIn(check = true) {
    const checkbox = await this.emailCheckboxEl;
    await checkbox.waitForDisplayed({ timeout: 5000 });
    const isChecked = (await checkbox.getAttribute('checked')) === 'true';
    if (check !== isChecked) {
      await checkbox.click();
      // Add stabilization pause to let UI update after checkbox state change
      await this.driver.pause(800);
    }
  }

  /**
   * Tap "VISIT TO THE WEBSITE TO COMPLETE PURCHASE" — opens a Chrome Custom Tab (CCT)
   * inside the app. getCurrentPackage() stays as com.androidsample.generalstore.
   * Waits for the CCT to load by pausing until the button is no longer in focus.
   */
  async tapVisitWebsite() {
    const btn = await this.visitWebsiteEl;
    await btn.waitForDisplayed({ timeout: 5000 });
    await btn.click();
    await btn.waitForDisplayed({ timeout: 10000, reverse: true }).catch(() => {});
  }

  /**
   * Tap the back arrow to return to the products screen.
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
    return (await this.visitWebsiteEl).isDisplayed();
  }

  /**
   * Scroll through the entire cart list and return all product names.
   * @returns {Promise<string[]>}
   */
  async getCartProductNames() {
    const seen = new Set();

    let prevSize = -1;
    let scrolls = 0;

    while (scrolls < 10) {
      const els = await this.driver.$$(this.cartProductName);
      for (const el of els) {
        const text = await el.getText().catch(() => '');
        if (text) seen.add(text);
      }
      if (seen.size === prevSize) break;
      prevSize = seen.size;

      await this.driver.$(
        `android=new UiScrollable(new UiSelector().resourceId("com.androidsample.generalstore:id/rvCartProductList")).scrollForward()`
      ).catch(() => {});
      await this.driver.pause(300);
      scrolls++;
    }

    return Array.from(seen);
  }

  /**
   * @returns {Promise<string[]>}
   */
  async getCartProductPrices() {
    const els = await this.driver.$$(this.cartProductPrice);
    return els.map((el) => el.getText());
  }

  /**
   * Returns the total amount text e.g. "$ 280.97".
   */
  async getTotalAmount() {
    const el = await this.totalAmountEl;
    await el.waitForDisplayed({ timeout: 5000 });
    return el.getText();
  }

  async isEmailOptInChecked() {
    const checkbox = await this.emailCheckboxEl;
    return (await checkbox.getAttribute('checked')) === 'true';
  }

  /**
   * Returns the terms text: "Please read our terms of conditions".
   */
  async getTermsText() {
    const el = await this.termsTextEl;
    await el.waitForDisplayed({ timeout: 5000 });
    return el.getText();
  }

  async getItemCount() {
    const names = await this.getCartProductNames();
    return names.length;
  }
}

module.exports = CartPage;
