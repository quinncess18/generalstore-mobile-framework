# Mobile Automation Framework — General Store Android E2E

An enterprise-grade, high-performance mobile automation suite built with **Playwright (Test Runner)**, **WebdriverIO (Remote Driver)**, and **Appium 2.x**. This framework is designed for the **General Store** Android application, featuring cross-device parallel execution, persistent session management, and robust UI stabilization strategies.

---

## 🚀 Project Overview

This suite provides comprehensive End-to-End (E2E) and Negative test coverage across the application's core shopping flows. By leveraging the **Taqelah-inspired** architecture, the framework ensures stability on real devices (**Pixel 5 (Local)** and **Pixel Tablet**) through custom synchronization fixtures and viewport-aware interaction strategies.

### **Core Capabilities**
*   **Parallel Execution:** Dynamic scaling using one Playwright worker per connected device.
*   **Persistent Sessions:** Worker-scoped Appium sessions that persist across multiple test files for maximum speed.
*   **State Stabilization:** Custom `stablePage` fixture utilizing `mobile: startActivity` for ultra-fast, non-destructive app resets.
*   **Silent Execution:** All `[Diagnostic]` and `[Test]` logs are silenced by default for clean CI output.
*   **Device-Aware Interaction:** Targeted mitigations for OS-level gesture navigation and tablet-specific rendering.

---

## 🛠️ Technical Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Test Runner** | [Playwright](https://project.microsoft.com/playwright) | Orchestration, parallelization, and rich reporting. |
| **Mobile Driver** | [WebdriverIO](https://webdriver.io/) | High-level API for remote Appium command execution. |
| **Automation Engine** | [Appium 2.x](http://appium.io/) | Cross-platform mobile automation server. |
| **Android Driver** | [UIAutomator2](https://github.com/appium/appium-uiautomator2-driver) | Native Android automation engine (API 28+). |        
| **Language** | JavaScript (Node.js) | Flexible, asynchronous scripting without a build step. |

---

## 🏛️ Architecture & Design Patterns

The framework follows a modular, decoupled architecture to ensure long-term maintainability and scalability.

### **1. Page Object Model (POM)**
Located in `tests/pages/`, every screen (Login, Products, Cart) is encapsulated in a class that manages its own selectors (XPath with `resource-id` preference) and high-level action methods.

### **2. The stablePage Strategy**
To avoid the overhead of full app restarts, the `stablePage` fixture resets the UI to the login screen before every test using `mobile: startActivity`. This is a "non-destructive" reset that preserves the UIAutomator2 instrumentation, preventing the common "404 Invalid Session" errors associated with `terminateApp`.

### **3. Centralized Diagnostic Logging**
The framework uses a centralized `Logger.js` utility. Logs are categorized into `[Test]` (flow milestones) and `[Diagnostic]` (internal state/retries). By default, these are suppressed to keep the CI console clean.

---

## 📁 Project Structure

```bash
mobile-automation-framework/
├── apps/                        # APK storage (General-Store.apk)
├── config/
│   └── devices.config.js        # Central device registry and port mapping
├── fixtures/
│   ├── appFixture.js            # Worker-scoped WebdriverIO session management
│   ├── uniqueUsername.js        # Dynamic test-data generator
│   └── stablePage.js            # UI synchronization and state reset logic
├── tests/
│   ├── data/                    # JSON-based test data and constants
│   ├── pages/                   # Page Object Model (POM) implementation
│   ├── specs/                   # Categorized test suites (E2E, Negative)
│   └── utils/
│       └── Logger.js            # Centralized conditional logging utility
├── global-setup.js              # Environment pre-flight (APK & Appium verification)
├── playwright.config.js         # Core runner configuration (Scaling & Workers)
└── TEST_PLAN.md                 # Scenario breakdown and coverage status
```

---

## 🚦 Execution & Reporting

### **Standard Run Commands**
```bash
# Full Regression (Dual-device parallel)
npm test

# Focused Suite Runs
npm run test:login      # Authentication flows
npm run test:products   # Catalog and inventory management
npm run test:cart       # Shopping cart and payment gateway
npm run test:negative   # Input validation and error handling
```

### **Diagnostic Logging (Verbose Mode)**
To see detailed diagnostic information and test milestones, set the `DEBUG` environment variable to `true`:
```bash
# Windows (PowerShell)
$env:DEBUG='true'; npm test

# Linux/macOS
DEBUG=true npm test
```

### **Advanced CI/CD Overrides**
The framework is fully CI-ready, allowing environment-level overrides for infrastructure-specific paths:
```bash
APPIUM_HOST=127.0.0.1 DEVICE_0_UDID=<udid> APP_PATH=/tmp/app.apk npm test
```

---

## ⚠️ Known Issues & Troubleshooting

| Symptom | Diagnosis | Resolution |
|---|---|---|
| **Session Drops (404)** | `terminateApp` was called. | **Rule:** Always use `mobile: startActivity` for resets. |
| **Gesture Nav Interference** | Pixel 5 (Local) scroll too deep. | Framework uses `scrollPercent: 0.10` for Pixel stability. |
| **Spinner Race Condition** | UI state not settled. | Hardened via `split-scroll` pattern and `800ms` settle pause. |
| **Stale Element Reference** | Viewport recycled too fast. | W3C action swipes used with `1500ms` duration for stability. |

---

## 🌐 Global Portability & CI/CD Setup

This framework is designed to be fully portable. If you fork this repository, follow these steps to set up your own CI/CD pipeline:

### **1. GitHub Actions Variables**
Navigate to **Settings > Secrets and variables > Actions > Variables** and add the following:
*   `APP_PATH_LOCAL`: The absolute path to your `General-Store.apk` on your local runner machine.
*   `DEVICE_0_UDID`: The UDID of your first device (e.g., `emulator-5554`).
*   `DEVICE_1_UDID`: The UDID of your second device (optional).

### **2. Appium Security Setup**
Appium 2.x requires the `adb_shell` feature to be explicitly enabled for advanced stabilization. Always start your server with:
```bash
npx appium --allow-insecure adb_shell
```
This is already included in the `npm run appium:start` script.

---

## 🏅 Credits & Acknowledgments

This framework is built upon the enterprise-grade testing architecture and design patterns established in the **[Taqelah Lab Project](https://github.com/quinncess18/taqelah-lab-project-test)**. As my first project, the Taqelah web framework served as the foundational baseline for the architectural and organizational strategies implemented in this mobile suite, particularly in its approach to:

*   **State Stabilization:** The `stablePage` and `visual-fixture` patterns.
*   **Multi-Device Scaling:** The worker-scoped parallel execution model.
*   **Modular POM:** High-performance, decoupled Page Object Model design.

This project represents the evolution of the **Taqelah Automation Standard**, adapted for high-performance mobile automation.

---

## 📐 How to Scale
To add a new device to the matrix:
1. Connect the device via USB/ADB.
2. Add a new entry to `config/devices.config.js` with a unique `systemPort`.
3. The framework will automatically spawn an additional worker and project instance in the next run.
