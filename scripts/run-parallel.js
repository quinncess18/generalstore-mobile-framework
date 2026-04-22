// @ts-check
const { spawn } = require('child_process');
const { DEVICES } = require('../config/devices.config');

/**
 * Custom runner for parallel cross-device execution.
 * 
 * Playwright natively parallelizes by file, not by project. If we use `workers: 2`
 * with 2 devices and multiple files, Playwright might assign both workers to the 
 * SAME device concurrently, causing Appium port clashes and UIAutomator2 crashes.
 * 
 * This script bypasses that flaw by spawning a dedicated Playwright process for 
 * EACH device, forcing strictly sequential execution per device while running 
 * all devices concurrently.
 */

console.log(`\n[run-parallel] Starting cross-device execution across ${DEVICES.length} devices...`);

const extraArgs = process.argv.slice(2);

DEVICES.forEach((device) => {
  console.log(`[run-parallel] Spawning runner for: ${device.name}`);
  
  const runner = spawn(
    'npx',
    ['playwright', 'test', `--project="${device.name}"`, '--workers=1', ...extraArgs],
    { stdio: 'inherit', shell: true }
  );

  runner.on('close', (code) => {
    if (code !== 0) {
      console.error(`[run-parallel] ❌ Runner for ${device.name} exited with code ${code}`);
      process.exitCode = 1; // Fail the overall run if any device fails
    } else {
      console.log(`[run-parallel] ✅ Runner for ${device.name} completed successfully.`);
    }
  });
});
