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
      `.scrollIntoView(new UiSelector().text("${country}"))`;

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
   * @param {string} country  Exact label e.g. 'India', 'Australia'
   */
  async selectCountry(country) {
    const current = await this.getSelectedCountry();
    if (current === country) return;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const spinner = await this.spinnerEl;
      await spinner.waitForDisplayed({ timeout: 5000 });
      await spinner.click();

      // Wait for the dropdown ListView to be present and displayed before scrolling
      const list = await this.driver.$(this.countryDropdownList);
      await list.waitForDisplayed({ timeout: 5000 }).catch(() => {});

      try {
        // Step 1: Execute UiScrollable to find the country and wait for it to be visible.
        const scrollSelector = this.countryOptionByName(country);
        // Increase timeout to 30s for long lists in CI/Emulators
        await this.driver.$(scrollSelector).waitForDisplayed({ timeout: 30000 });

        // Step 2: Settle-Before-Click
        // Increased to 800ms to handle large flings on tablets like Xiaomi Pad 6.
        await this.driver.pause(800);

        // Step 3: Perform the click.
        // Use an exact text match instead of the UiScrollable locator.
        const exactItem = await this.driver.$(`//android.widget.TextView[@text="${country}"]`);

        // Wait for the exact item to be exist and displayed in the DOM before clicking.
        // If inertia carried it off-screen, this ensures we don't try to click a non-existent element.
        await exactItem.waitForExist({ timeout: 3000 });
        await exactItem.click();
        return; // Success
      } catch (error) {
        console.log(`[Diagnostic] Attempt ${attempt} failed to find country ${country}.`);
        // Close dropdown via hardware back before retrying
        await this.driver.execute('mobile: pressKey', { keycode: 4 });
        await this.driver.pause(1000);
      }
    }
    throw new Error(`Failed to find country "${country}" after retries.`);
  }
  /**
   * Type a name into the "Your Name" field.
   * Clears any existing value first.
   * @param {string} name
   */
  async enterName(name) {
    const field = await this.nameFieldEl;
    await field.waitForDisplayed({ timeout: 5000 });
    
    // Step 1: Preliminary clear
    await field.clearValue();
    await this.driver.pause(500);

    // Step 2: Set value (e.g. spaces for negative tests)
    await field.setValue(name);
    
    // Step 3: Verify and retry if it didn't take (critical for CI)
    const currentVal = await field.getText().catch(() => '');
    if (name.trim() === '' && currentVal !== '' && currentVal !== 'Enter name here') {
      console.log(`[Diagnostic] Name field not clear (value: '${currentVal}'). Retrying clear...`);
      await field.clearValue();
      await field.setValue(name);
    }
    
    // Check if keyboard is active before attempting to hide to prevent hanging
    try {
      if (await this.driver.isKeyboardShown()) {
        await this.driver.hideKeyboard().catch(() => {});
        // Settle pause after hiding keyboard
        await this.driver.pause(800);
      }
    } catch (e) {
      console.log(`[Diagnostic] Failed to check/hide keyboard: ${e.message}`);
    }
  }

  /**
   * Select a gender radio button.
   * @param {'Male' | 'Female'} gender
   */
  async selectGender(gender) {
    const el = gender === 'Female' ? await this.radioFemaleEl : await this.radioMaleEl;
    await el.waitForDisplayed({ timeout: 5000 });
    await el.click();
    await this.driver.pause(500);
  }

  /**
   * Tap the "LET'S SHOP" button.
   */
  async tapLetsShop() {
    const btn = await this.letsShopEl;
    await btn.waitForDisplayed({ timeout: 5000 });
    // Settle pause before critical action
    await this.driver.pause(500);
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
