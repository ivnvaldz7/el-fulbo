/**
 * Playwright auth helper - two modes:
 * 
 * MODE 1: "extract" - navegá manualmente, te mostramos las cookies
 * MODE 2: "test" - usá cookies guardadas para navegar autenticado
 * 
 * Uso:
 *   node scripts/test-auth-flow.mjs extract    → login manual, muestra cookies
 *   node scripts/test-auth-flow.mjs test       → usa cookies guardadas
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const COOKIE_FILE = join(__dirname, 'auth-cookies.json');

const mode = process.argv[2] || 'test';

async function extractCookies() {
  console.log('🔐 Abriendo browser PARA VOS — logueate con Google manualmente.');
  console.log('   Después de login, cerra el browser y las cookies se guardan.\n');

  const browser = await chromium.launch({ headless: false, devtools: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Monitorear cookies
  context.on('page', async (p) => {
    // Cuando navega, chequeamos si hay cookies de Supabase
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  console.log('   Login page loaded. Login with Google...');

  // Esperar a que la sesión se establezca (detectamos por la URL)
  try {
    await page.waitForURL('**/groups/**', { timeout: 120000 });
    console.log('   ✅ Login detectado! URL:', page.url());
  } catch {
    // Puede que termine en /groups o /auth/callback
    console.log('   Esperando...');
    await page.waitForTimeout(5000);
  }

  // Extraer cookies
  const cookies = await context.cookies();
  const sbCookies = cookies.filter(c => c.name.includes('sb-') || c.name === 'sb-access-token' || c.name === 'sb-refresh-token');
  
  if (sbCookies.length === 0) {
    // Try different pattern - Supabase might use project-ref prefixed names
    const allCookies = cookies.map(c => c.name).join(', ');
    console.log(`   Cookies encontradas: ${allCookies}`);
    console.log('   No se encontraron cookies sb-. Buscando cualquier cookie de sesión...');
    
    // Save all cookies for debugging
    writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    console.log(`   ✅ Todas las cookies guardadas en ${COOKIE_FILE}`);
  } else {
    writeFileSync(COOKIE_FILE, JSON.stringify(sbCookies, null, 2));
    console.log(`\n   ✅ Cookies de Supabase guardadas (${sbCookies.length}):`);
    for (const c of sbCookies) {
      console.log(`      - ${c.name}: ${c.value.slice(0, 20)}...`);
    }
  }

  await browser.close();
  console.log('\n   Browser cerrado. Ahora corre: node .test-scripts/test_auth_flow.mjs test');
}

async function testWithCookies() {
  if (!existsSync(COOKIE_FILE)) {
    console.log('❌ No hay cookies guardadas. Primero corre:');
    console.log('   node scripts/test-auth-flow.mjs extract');
    process.exit(1);
  }

  const cookies = JSON.parse(readFileSync(COOKIE_FILE, 'utf-8'));
  console.log(`📦 Usando ${cookies.length} cookies guardadas\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Setear cookies ANTES de navegar
  await context.addCookies(cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain || 'localhost',
    path: c.path || '/',
    httpOnly: c.httpOnly ?? true,
    secure: c.secure ?? false,
    sameSite: c.sameSite || 'Lax',
  })));

  const page = await context.newPage();
  const results = { passed: 0, failed: 0 };

  function assert(cond, msg) {
    if (cond) { console.log(`   ✅ ${msg}`); results.passed++; }
    else { console.log(`   ❌ ${msg}`); results.failed++; }
  }

  // Test 1: Dashboard (ruta protegida principal)
  console.log('📄 Test 1: GET /groups (dashboard)');
  const resp1 = await page.goto(`${BASE_URL}/groups`, { waitUntil: 'networkidle', timeout: 15000 });
  const url1 = page.url().replace(BASE_URL, '');
  assert(resp1.status() === 200, `Status 200 (got ${resp1.status()})`);
  assert(!url1.includes('login'), `No redirect a login (url: ${url1})`);
  
  // Screenshot
  await page.screenshot({ path: join(__dirname, 'dashboard_auth.png'), fullPage: true });
  console.log('   📸 Screenshot: .test-scripts/dashboard_auth.png');

  // Test 2: Look for the user's info / profile elements
  const bodyText = await page.locator('body').innerText();
  const hasProfileElements = bodyText.includes('Grupo') || bodyText.includes('grupo') || bodyText.includes('Fulbo');
  assert(hasProfileElements, 'Dashboard muestra contenido del usuario');

  // Test 3: Console errors
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(String(err)));
  
  // Navigate a few pages
  console.log('\n📄 Test 3: Navegar rutas protegidas');

  const routes = ['/groups', '/groups/some-id/dashboard', '/login'];
  for (const route of routes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    const url = page.url().replace(BASE_URL, '');
    assert(!url.includes('login'), `/${route} → ${url} (no redirect a login)`);
  }

  console.log(`\n📊 Resultados: ✅ ${results.passed} | ❌ ${results.failed} | Console errors: ${consoleErrors.length}`);

  if (consoleErrors.length > 0) {
    console.log('\n   ❌ Console errors:');
    for (const e of consoleErrors) console.log(`      - ${e.slice(0, 200)}`);
  }

  await browser.close();
  process.exit(results.failed > 0 ? 1 : 0);
}

// Main
if (mode === 'extract') {
  await extractCookies();
} else {
  await testWithCookies();
}
