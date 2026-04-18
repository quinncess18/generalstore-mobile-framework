// @ts-check

/**
 * Login inputs per test case.
 *
 * Countries are non-alphabetical and scattered to stress UiScrollable
 * across varying scroll distances from the Afghanistan default.
 *
 * Tests that use uniqueUsername omit the name field here —
 * the fixture injects a worker-scoped unique value at runtime.
 *
 * TC_L04's long name is defined as a constant so its length is
 * self-documenting and verifiable.
 */

const LONG_NAME_51 = 'Abcdefghijklmnopqrstuvwxyz Abcdefghijklmnopqrstuvwx'; // 51 chars

module.exports = {
  // login.spec.js — TC-L01 has no login data (observes default state only)
  TC_L02: { country: 'Bahamas',     gender: 'Female', name: '#@!$%^&*()' },
  TC_L03: { country: 'Belgium',     gender: 'Male',   name: '0987654321' },
  TC_L04: { country: 'Australia',   gender: 'Female', name: LONG_NAME_51 },

  // products.spec.js — shared login for TC-P01–P04 and TC-P-NEG01
  TC_PRODUCTS: { country: 'Canada',  gender: 'Male',   name: 'John2024' },
  TC_P05:      { country: 'Germany', gender: 'Female', name: 'User_Test#2' },

  // cart.spec.js — name supplied by uniqueUsername fixture at runtime
  TC_C01:        { country: 'Thailand',  gender: 'Male'   },
  TC_C02:        { country: 'Malaysia',  gender: 'Female' },
  TC_C03:        { country: 'Colombia',  gender: 'Male'   },
  TC_C03_RELOGIN:{ country: 'Germany',   gender: 'Female' },

  // negative/login-negative.spec.js
  TC_L_NEG01: { country: 'India',       gender: 'Male'            }, // name intentionally absent — empty input test
  TC_L_NEG02: { country: 'Philippines', gender: 'Female', name: '     ' },
};
