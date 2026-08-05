const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const modeArgument = args.find((arg) => ['--production', '--dev', '--local'].includes(arg)) || '--production';
const mode = modeArgument.slice(2);
const envFile = mode === 'dev' ? '.env.development' : mode === 'local' ? '.env.local' : '.env.production';
const requestedEnvPath = path.resolve(__dirname, '..', envFile);
const exampleEnvPath = `${requestedEnvPath}.example`;
const envPath = fs.existsSync(requestedEnvPath) ? requestedEnvPath : exampleEnvPath;
const expoArgs = args.filter((arg) => !['--production', '--dev', '--local'].includes(arg));

if (!fs.existsSync(envPath)) {
  console.error(`[wordcontrol] Missing ${envFile} and ${envFile}.example.`);
  process.exit(1);
}

const selectedEnv = {};
for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith('#')) continue;
  const separator = line.indexOf('=');
  if (separator < 1) continue;
  const key = line.slice(0, separator).trim();
  let value = line.slice(separator + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  selectedEnv[key] = value;
}

if (!selectedEnv.EXPO_PUBLIC_API_URL) {
  console.error(`[wordcontrol] EXPO_PUBLIC_API_URL is missing from ${envFile}.`);
  process.exit(1);
}

if (!expoArgs.includes('--clear') && !expoArgs.includes('-c')) {
  expoArgs.push('--clear');
}

console.log(`[wordcontrol] ${mode} mode → ${selectedEnv.EXPO_PUBLIC_API_URL}`);

const expoBin = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'expo.cmd' : 'expo',
);

const expo = spawn(expoBin, ['start', ...expoArgs], {
  env: { ...selectedEnv, ...process.env },
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
