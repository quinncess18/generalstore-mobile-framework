# Test Plan — General Store Android App

Tracks all test coverage across suites in this repository.

**Execution model:** Tests run in parallel across two real devices simultaneously.
Worker 0 → Pixel 5 (Local) (`emulator-5554`), Worker 1 → Pixel Tablet (`emulator-5556`).

---

## Coverage Summary

| Suite | Spec File | Tests | Status |
|---|---|---|---|
| Login — default state + char acceptance | `e2e/login.spec.js` | 4 | ✅ |
| Products — page state + cart flows | `e2e/products.spec.js` | 6 | ✅ |
| Cart — state + back navigation | `e2e/cart.spec.js` | 3 | ✅ |
| Login — negative | `negative/login-negative.spec.js` | 2 | ✅ |
| **Total** | | **15** | |

**Legend:** ✅ Passing — ⚠️ Known issue — ⬜ Not yet implemented

---

## `login.spec.js` — 4 tests

| ID | Country | Name | Gender | What it tests |
|---|---|---|---|---|
| TC-L01 | — | — | — | Default state: Afghanistan, empty name, Male selected, "Let's Shop" visible |
| TC-L02 | Bahamas | `#@!$%^&*()` | Female | Special characters accepted → proceeds to Products |
| TC-L03 | Belgium | `0987654321` | Male | Numeric-only name accepted → proceeds to Products |
| TC-L04 | Australia | 51-char string | Female | Long name accepted → proceeds to Products |

---

## `products.spec.js` — 6 tests

| ID | Type | What it tests | Products |
|---|---|---|---|
| TC-P01 | serial | Products page default state: all 10 items listed (photo/name/price/button), cart empty | All 10 |
| TC-P02 | serial | ADD TO CART toggle: tap → button gray/cart=1 → tap again → button re-enabled/cart=0 | Converse All Star |
| TC-P03 | serial | Add product → cart=1 → tap cart icon → Cart page opens | Jordan Lift Off |
| TC-P04 | serial | Back from Cart → Products intact, scrollable, cart icon still shows item | — |
| TC-P05 | independent | Add two products → cart=2, both buttons gray → tap cart icon → redirected to Cart page | Air Jordan 9 Retro + Jordan 6 Rings |
| TC-P-NEG01 | independent | Tap cart icon with no items → toast `"Please add some product at first"` → stays on Products | — |

---

## `cart.spec.js` — 3 tests

### TC-C01 — Single product cart state
**Product:** Air Jordan 4 Retro

| Step | Action | Expected |
|---|---|---|
| 1 | Observe product in cart | Name, price, photo match Products page |
| 2 | Check Total Purchase Amount | Equals item price ($160.97) |
| 3 | Check email checkbox | Unticked by default |
| 4 | Check proceed button | "Visit to the website to complete purchase" is visible |
| 5 | Tap proceed button | Redirected to browser (CCT — Google) |

### TC-C02 — Multiple products cart state
**Products:** Air Jordan 1 Mid SE + LeBron Soldier 12 + Nike Blazer Mid '77

| Step | Action | Expected |
|---|---|---|
| 1 | Observe all products in cart | All names, prices, photos match Products page |
| 2 | Check Total Purchase Amount | Equals sum of all prices ($360.0) |
| 3 | Tick the checkbox | Checkbox is now ticked |
| 4 | Tap proceed button | Redirected to browser (CCT — Google) |

### TC-C03 — Back navigation flow
**Product:** Nike SFB Jungle

| Step | Action | Expected |
|---|---|---|
| 1 | Press back from Cart | Products page — intact, scrollable, state preserved |
| 2 | Press back from Products | Login page — credentials retained |
| 3 | Log in again (same credentials) | Products page — cart icon is now empty (new session) |
| 4 | Tap cart icon | Toast: `"Please add some product at first"` — stays on Products |

---

## `negative/login-negative.spec.js` — 2 tests

| ID | Country | Name | Gender | Expected |
|---|---|---|---|---|
| TC-L-NEG01 | India | *(empty)* | Male | Toast: `"Please enter your name"` — stays on Login |
| TC-L-NEG02 | Philippines | `"     "` (spaces only) | Female | Toast: `"Please enter your name"` — stays on Login |
