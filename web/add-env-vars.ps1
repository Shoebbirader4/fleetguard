# Add environment variables to Vercel
Write-Host "Adding environment variables to Vercel..." -ForegroundColor Cyan
Write-Host ""

# VITE_SUPABASE_URL
Write-Host "1. Adding VITE_SUPABASE_URL..." -ForegroundColor Yellow
"https://ftywwrzkbtayapfiocck.supabase.co" | vercel env add VITE_SUPABASE_URL production

# VITE_SUPABASE_ANON_KEY
Write-Host "`n2. Adding VITE_SUPABASE_ANON_KEY..." -ForegroundColor Yellow
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eXd3cnprYnRheWFwZmlvY2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NzAyMTEsImV4cCI6MjA5NjM0NjIxMX0.XrhRU1LUdUS6ZVb0Aweb2TJ3qlg9YRMq9AMrpSxd5o4" | vercel env add VITE_SUPABASE_ANON_KEY production

Write-Host "`n✅ Environment variables added!" -ForegroundColor Green
