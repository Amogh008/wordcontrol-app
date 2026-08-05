const { spawn } = require('node:child_process');
const path = require('node:path');

const DEV_ARGUMENTS = new Set(['dev', '-dev', '--dev']);
const args = process.argv.slice(2);
const useDevelopmentMode = args.some((arg) => DEV_ARGUMENTS.has(arg));
const expoArgs = args.filter((arg) => !DEV_ARGUMENTS.has(arg));

if (useDevelopmentMode && !expoArgs.includes('--clear') && !expoArgs.includes('-c')) {
  expoArgs.push('--clear');
}

console.log('[wordcontrol] API URL is loaded from EXPO_PUBLIC_API_URL.');

const expoBin = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'expo.cmd' : 'expo',
);

const expo = spawn(expoBin, ['start', ...expoArgs], {
  env: process.env,
  stdio: 'inherit',
});

expo.on('error', (error) => {
  console.error(`[wordcontrol] Could not start Expo: ${error.message}`);
  process.exitCode = 1;
});

expo.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
