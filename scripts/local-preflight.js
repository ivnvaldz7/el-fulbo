const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const net = require('node:net');

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
];

const expectedPorts = [
  { name: 'Supabase API', port: 55421 },
  { name: 'Supabase DB', port: 55432 },
  { name: 'Supabase Studio', port: 55423 },
];

function run(command, args) {
  execFileSync(command, args, { stdio: 'pipe', shell: process.platform === 'win32' });
}

function readEnvFile(path) {
  if (!existsSync(path)) return null;

  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((env, line) => {
      const separator = line.indexOf('=');
      if (separator === -1) return env;

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      env[key] = value;
      return env;
    }, {});
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(750);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

async function main() {
  const failures = [];

  try {
    run('docker', ['info']);
  } catch {
    failures.push('Docker no está corriendo o no está disponible en PATH.');
  }

  try {
    run('supabase', ['--version']);
  } catch {
    failures.push('Supabase CLI no está disponible. Instalá la CLI antes de correr el entorno local.');
  }

  const env = readEnvFile('.env.local');
  if (!env) {
    failures.push('Falta .env.local. Copiá .env.example y pegá las keys de `npm run supabase:status`.');
  } else {
    for (const key of requiredEnv) {
      if (!env[key] || env[key].startsWith('replace-')) {
        failures.push(`Falta configurar ${key} en .env.local.`);
      }
    }

    if (env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:55421') {
      failures.push('NEXT_PUBLIC_SUPABASE_URL no apunta al Supabase local esperado: http://127.0.0.1:55421.');
    }
  }

  for (const target of expectedPorts) {
    const open = await canConnect(target.port);
    if (!open) failures.push(`${target.name} no responde en 127.0.0.1:${target.port}. Corré npm run supabase:start.`);
  }

  if (failures.length === 0) {
    const authReady = await waitForHttp('http://127.0.0.1:55421/auth/v1/health', 15);
    if (!authReady) failures.push('Supabase Auth no responde en /auth/v1/health.');
  }

  if (failures.length > 0) {
    console.error('Preflight local falló:\n');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('Preflight local OK: Docker, Supabase, puertos y env están listos.');
}

main();

async function waitForHttp(url, attempts) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}
