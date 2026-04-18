// @ts-check

/**
 * LoginPage — Page Object Model for the General Store login screen.
 *
 * Screen layout (confirmed via uiautomator dump):
 *  - Static label: "Select the country where you want to shop" (no resource-id)
 *  - Spinner: spinnerCountry — defaults to "Afghanistan" (first alphabetically)
 *  - Static label: "Your Name" (no resource-id)
 *  - EditText: nameField
 *  - Static label: "Gender" (no resource-id)
 *  - RadioGroup: radioGender
 *    • RadioButton: radioMale  (text "Male")
 *    • RadioButton: radioFemale (text "Female")
 *  - Button: btnLetsShop (text "Let's  Shop")
 */
class LoginPage {
  /**
   * @param {import('webdriverio').Browser} driver
   */
  constructor(driver) {
    this.driver = driver;

    // ── Selectors (confirmed via uiautomator dump) ─────────────────────────

    this.countrySpinner =
      '//android.widget.Spinner[@resource-id="com.androidsample.generalstore:id/spinnerCountry"]';

    // Current selection text inside the spinner (resource-id android:id/text1)
    this.spinnerSelectedText =
      '//android.widget.Spinner[@resource-id="com.androidsample.generalstore:id/spinnerCountry"]/android.widget.TextView[@resource-id="android:id/text1"]';

    // When the spinner dropdown opens it shows a ListView — wait for this to confirm open
    this.countryDropdownList =
      '//android.widget.ListView';

    // UiScrollable: scroll the dropdown ListView to find a country by name and tap it
    /** @type {(country: string) => string} */
    this.countryOptionByName = (country) =>
      `android=new UiScrollable(new UiSelector().className("android.widget.ListView"))` +
      `.setMaxSearchSwipes(50)` +
      `.scrollIntoView(new UiSelector().text("${country}").className("android.widget.TextView"))`;

    this.nameField =
      '//android.widget.EditText[@resource-id="com.androidsample.generalstore:id/nameField"]';

    this.radioMale =
      '//android.widget.RadioButton[@resource-id="com.androidsample.generalstore:id/radioMale"]';

    this.radioFemale =
      '//android.widget.RadioButton[@resource-id="com.androidsample.generalstore:id/radioFemale"]';

    this.letsShopButton =
      '//android.widget.Button[@resource-id="com.androidsample.generalstore:id/btnLetsShop"]';

    // Toast — fires only when name field is empty ("Please enter your name")
    this.toastMessage =
      '//android.widget.Toast';
  }

  // ── Element getters ───────────────────────────────────────────────────────

  get spinnerEl()     { return this.driver.$(this.countrySpinner); }
  get nameFieldEl()   { return this.driver.$(this.nameField); }
  get radioMaleEl()   { return this.driver.$(this.radioMale); }
  get radioFemaleEl() { return this.driver.$(this.radioFemale); }
  get letsShopEl()    { return this.driver.$(this.letsShopButton); }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Wait until the country spinner is visible — confirms login screen is ready.
   */
  async waitForScreen() {
    await this.driver.waitUntil(
      async () => (await this.spinnerEl).isDisplayed(),
      { timeout: 15000, timeoutMsg: 'LoginPage: country spinner not visible after 15 s' }
    );
  }

  /**
   * Opens the country spinner and scrolls through the full list to collect every country name.
   * The dropdown ListView is scrollable and only shows ~9 items at a time, so this scrolls
   * repeatedly until no new items appear, then closes the spinner.
   * @returns {Promise<string[]>} Sorted array of all country names
   */
  async getCountryList() {
    const spinner = await this.spinnerEl;
    await spinner.waitForDisplayed({ timeout: 5000 });
    await spinner.click();

    const list = await this.driver.$('//android.widget.ListView');
    await list.waitForDisplayed({ timeout: 5000, timeoutMsg: 'Country dropdown ListView did not open' });

    const seen = new Set();
    let previousSize = -1;

    while (seen.size !== previousSize) {
      previousSize = seen.size;

      const items = await this.driver.$$(
        '//android.widget.ListView/android.widget.TextView[@resource-id="android:id/text1"]'
      );
      for (const item of items) {
        seen.add(await item.getText());
      }

      if (seen.size !== previousSize) {
        // New items were found — scroll down to reveal more
        const loc  = await list.getLocation();
        const size = await list.getSize();
        await this.driver.execute('mobile: scrollGesture', {
          left:      Math.round(loc.x),
          top:       Math.round(loc.y),
          width:     Math.round(size.width),
          height:    Math.round(size.height),
          direction: 'down',
          percent:   0.75,
        });
        // Wait until the last visible item has readable text — confirms scroll animation settled
        const itemSel = '//android.widget.ListView/android.widget.TextView[@resource-id="android:id/text1"]';
        await this.driver.waitUntil(async () => {
          const els = await this.driver.$$(itemSel);
          if (els.length === 0) return false;
          const lastText = await els[els.length - 1].getText().catch(() => '');
          return lastText.length > 0;
        }, { timeout: 2000 }).catch(() => {});
      }
    }

    // Close the dropdown and wait for the ListView to disappear
    await this.driver.execute('mobile: pressKey', { keycode: 4 });
    await list.waitForDisplayed({ timeout: 3000, reverse: true }).catch(() => {});

    return Array.from(seen).sort();
  }

  /**
   * Open the country dropdown and select a country by name.
   * Spinner defaults to "Afghanistan". UiScrollable scrolls the ListView to the target.
   *
   * Two-step approach to avoid tapping an alphabetical neighbour:
   *   1. Execute UiScrollable to scroll the target into view (result element discarded).
   *   2. Pause briefly so the scroll animation finishes.
   *   3. Re-find the item via a plain XPath (no scroll, fresh coordinates) and click it.
   *
   * Do NOT call waitForClickable/waitForDisplayed on the UiScrollable element directly —
   * those re-execute the selector and trigger a second scroll.
   *
   * @param {string} country  Exact label e.g. 'India', 'Australia'
   */
  async selectCountry(country) {
    const spinner = await this.spinnerEl;
    await spinner.waitForDisplayed({ timeout: 5000 });
    await spinner.click();

    // Wait for the dropdown ListView to appear
    await this.driver.waitUntil(
      async () => {
        const list = await this.driver.$(this.countryDropdownList);
        return list.isDisplayed();
      },
      { timeout: 5000, timeoutMsg: 'Country dropdown ListView did not open' }
    );

    // Step 1: scroll the target country into view (element reference discarded)
    await this.driver.$(this.countryOptionByName(country));

    // Step 2: brief settle — enough for the animation to stop without risking
    // auto-dismiss of the dropdown (300 ms was too long on Xiaomi Pad 6).
    await this.driver.pause(100);

    // Step 3: click via plain XPath — no UiScrollable re-execution, coordinates
    // are captured after the list has stopped moving.
    // Note: do NOT scope to android.widget.ListView — Xiaomi uses DropDownListView
    // (a ListView subclass) which XPath class matching does not reach.
    const exactItem = await this.driver.$(
      `//android.widget.TextView[@text="${country}"]`
    );
    await exactItem.click();
  }

  /**
   * Type a name into the "Your Name" field.
   * Clears any existing value first.
   * @param {string} name
   */
  async enterName(name) {
    const field = await this.nameFieldEl;
    await field.waitForDisplayed({ timeout: 5000 });
    await field.clearValue();
    await field.setValue(name);
    await this.driver.hideKeyboard().catch(() => {});
  }

  /**
   * Select a gender radio button.
   * @param {'Male' | 'Female'} gender
   */
  async selectGender(gender) {
    const el = gender === 'Female' ? await this.radioFemaleEl : await this.radioMaleEl;
    await el.waitForDisplayed({ timeout: 5000 });
    await el.click();
  }

  /**
   * Tap the "LET'S SHOP" button.
   */
  async tapLetsShop() {
    const btn = await this.letsShopEl;
    await btn.waitForDisplayed({ timeout: 5000 });
    await btn.click();
  }

  /**
   * Full happy-path login.
   * @param {{ country: string, name: string, gender?: 'Male' | 'Female' }} opts
   */
  async login({ country, name, gender = 'Female' }) {
    await this.waitForScreen();
    await this.selectCountry(country);
    await this.enterName(name);
    await this.selectGender(gender);
    await this.tapLetsShop();
  }

  /**
   * Attempt to proceed without entering a name (negative scenario).
   * @param {{ country: string, gender?: 'Male' | 'Female' }} opts
   */
  async attemptLoginWithoutName({ country, gender = 'Female' }) {
    await this.waitForScreen();
    await this.selectCountry(country);
    const field = await this.nameFieldEl;
    await field.clearValue();
    await this.selectGender(gender);
    await this.tapLetsShop();
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async isDisplayed() {
    return (await this.spinnerEl).isDisplayed();
  }

  /**
   * Returns the currently selected country text from the spinner.
   * Defaults to "Afghanistan" on fresh app launch.
   */
  async getSelectedCountry() {
    const el = await this.driver.$(this.spinnerSelectedText);
    return el.getText();
  }

  async getNameFieldValue() {
    const val = await (await this.nameFieldEl).getText();
    // UIAutomator2 returns the hint text when the field is empty on some devices.
    // Normalise to empty string so callers can always check against ''.
    return val === 'Enter name here' ? '' : val;
  }

  /**
   * @param {'Male' | 'Female'} gender
   */
  async isGenderSelected(gender) {
    const el = gender === 'Female' ? await this.radioFemaleEl : await this.radioMaleEl;
    return (await el.getAttribute('checked')) === 'true';
  }

  /**
   * Waits for and returns the text of a Toast notification.
   * Only fires for empty/spaces-only name: "Please enter your name".
   * @param {number} [timeout=3000]
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

module.exports = LoginPage;
