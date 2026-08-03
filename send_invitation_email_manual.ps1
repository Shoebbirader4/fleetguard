# Manual script to send invitation email for existing invitation
# This calls the send-invitation-email Edge Function

$SUPABASE_URL = "https://ftywwrzkbtayapfiocck.supabase.co"
$SUPABASE_ANON_KEY = $env:SUPABASE_ANON_KEY  # You'll need to set this

# Invitation details from database
$invitationToken = "e4b2df43-8073-48df-8d8f-d9b113cde241-mscd1mag"
$email = "shoebahmedbirader@gmail.com"
$fullName = "Haseeb"
$role = "driver"
$tenantId = "7d886908-eff7-4ded-84df-3579693ff7b9"
$tenantName = "humsafar"
$invitedBy = "shoeb ahmed"

# Build invitation URL (replace with your actual app URL)
$appUrl = "https://your-app.vercel.app"  # UPDATE THIS!
$invitationUrl = "$appUrl/join?token=$invitationToken"

# Build request body
$body = @{
    email = $email
    full_name = $fullName
    role = $role
    invitation_token = $invitationToken
    invitation_url = $invitationUrl
    tenant_name = $tenantName
    invited_by = $invitedBy
    tenant_id = $tenantId
} | ConvertTo-Json

Write-Host "Sending invitation email to: $email"
Write-Host "Invitation URL: $invitationUrl"
Write-Host ""

# Call Edge Function
$response = Invoke-RestMethod `
    -Uri "$SUPABASE_URL/functions/v1/send-invitation-email" `
    -Method POST `
    -Headers @{
        "Content-Type" = "application/json"
        "apikey" = $SUPABASE_ANON_KEY
    } `
    -Body $body

Write-Host "Response:"
$response | ConvertTo-Json -Depth 10

if ($response.success) {
    Write-Host ""
    Write-Host "✅ Invitation email sent successfully!" -ForegroundColor Green
    Write-Host "Check your inbox: $email" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Failed to send email:" -ForegroundColor Red
    Write-Host $response.error -ForegroundColor Red
}
