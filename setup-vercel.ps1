$ErrorActionPreference = "Stop"

Write-Host "1. Linkeando proyecto a Vercel..."
npx vercel link --yes

Write-Host "2. Subiendo variables de Supabase..."
Write-Output "tu_supabase_url" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
Write-Output "tu_anon_key" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
Write-Output "tu_service_role_key" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production

Write-Host "3. Subiendo variables de Web Push (VAPID)..."
Write-Output "tu_vapid_public" | npx vercel env add NEXT_PUBLIC_VAPID_PUBLIC_KEY production
Write-Output "tu_vapid_public" | npx vercel env add VAPID_PUBLIC_KEY production
Write-Output "tu_vapid_private" | npx vercel env add VAPID_PRIVATE_KEY production

Write-Host "4. Creando CRON_SECRET (faltaba en tu .env.local pero es requerida por los specs)..."
Write-Output "fulbo-cron-secret-2026-xyz" | npx vercel env add CRON_SECRET production

Write-Host "5. Lanzando el deploy a producción..."
npx vercel --prod

Write-Host "¡Terminado!"
