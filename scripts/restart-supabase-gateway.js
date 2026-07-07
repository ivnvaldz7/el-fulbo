const { execFileSync } = require('node:child_process');

const gatewayContainer = 'supabase_kong_el-fulbo';

function run(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
}

try {
  const containers = run('docker', ['ps', '--format', '{{.Names}}']);
  if (!containers.split(/\r?\n/).includes(gatewayContainer)) {
    console.log(`Supabase gateway ${gatewayContainer} no está corriendo; no hace falta reiniciar.`);
    process.exit(0);
  }

  run('docker', ['restart', gatewayContainer]);
  console.log(`Supabase gateway reiniciado: ${gatewayContainer}.`);
} catch (error) {
  console.warn(`No se pudo reiniciar ${gatewayContainer}. Si Auth devuelve 502, reinicialo manualmente.`);
}
