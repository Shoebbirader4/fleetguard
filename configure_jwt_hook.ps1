# Configure JWT Custom Access Token Hook via Supabase Management API

$projectRef = "ftywwrzkbtayapfiocck"
$accessToken = $env:SUPABASE_ACCESS_TOKEN

if (-not $accessToken) {
    Write-Host "ERROR: SUPABASE_ACCESS_TOKEN environment variable not set"
    Write-Host "Please get your access token from: https://supabase.com/dashboard/account/tokens"
    Write-Host "Then set it: `$env:SUPABASE_ACCESS_TOKEN = 'your-token'"
    exit 1
}

# Enable the custom access token hook
$body = @{
    hook_name = "custom_access_token"
    enabled = $true
    function_name = "custom_access_token_hook"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

$uri = "https://api.supabase.com/v1/projects/$projectRef/database/hooks"

Write-Host "Configuring JWT custom access token hook..."
try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
    Write-Host "SUCCESS: JWT hook configured!" -ForegroundColor Green
    Write-Host $response | ConvertTo-Json
} catch {
    Write-Host "ERROR: Failed to configure hook" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
