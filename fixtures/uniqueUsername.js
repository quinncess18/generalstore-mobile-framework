// @ts-check
const { test: appTest, expect } = require('./appFixture');

/**
 * uniqueUsername fixture — generates a deterministic, collision-free username
 * per worker so parallel runs (if ever enabled) don't share login state.
 *
 * Scoped to 'worker' so the same username is reused within one worker's
 * test suite, matching the pattern used in taqelah-lab-project.
 *
 * Usage:
 *   const { test } = require('../../fixtures/uniqueUsername');
 *   test('login test', async ({ driver, uniqueUsername }) => { ... });
 */
const test = appTest.extend({
  uniqueUsername: [
    async ({}, use, workerInfo) => {
      const username = `TestUser${workerInfo.workerIndex}_${Date.now()}`;
      await use(username);
    },
    { scope: 'worker' },
  ],
});

module.exports = { test, expect };
