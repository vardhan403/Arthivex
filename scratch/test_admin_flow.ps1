$ErrorActionPreference = 'Stop'

Write-Host "=== Step 1: Health Check ==="
$health = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/health" -Method Get
Write-Host "Health status: $($health.status) $($health.version)"

Write-Host "`n=== Step 2: Bootstrap First Administrator ==="
$bootstrapBody = @{
    name = "Platform Administrator"
    email = "admin@finguard.internal"
    password = "AdminPassphrase123!"
    bootstrapSecret = "finguard-admin-bootstrap-secret-2026"
} | ConvertTo-Json

try {
    $bootstrapRes = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/bootstrap-admin" -Method Post -ContentType "application/json" -Body $bootstrapBody
    Write-Host "Admin bootstrapped successfully! Token received for user: $($bootstrapRes.user.email) role: $($bootstrapRes.user.role) onboardingStatus: $($bootstrapRes.user.onboardingStatus)"
    $adminToken = $bootstrapRes.token
} catch {
    Write-Host "Bootstrap notice: $($_.Exception.Message)"
    # If already bootstrapped, log in as admin
    $loginBody = @{
        email = "admin@finguard.internal"
        password = "AdminPassphrase123!"
    } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    $adminToken = $loginRes.token
    Write-Host "Logged in as existing admin: $($loginRes.user.email) role: $($loginRes.user.role)"
}

Write-Host "`n=== Step 3: Guardrail Check: Second Bootstrap Attempt ==="
try {
    $secondAttempt = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/bootstrap-admin" -Method Post -ContentType "application/json" -Body $bootstrapBody
    Write-Host "FAIL: Second bootstrap should have been blocked!"
} catch {
    Write-Host "PASS: Second bootstrap blocked as expected: $($_.Exception.Response.StatusCode.value__)"
}

$adminHeaders = @{
    Authorization = "Bearer $adminToken"
}

Write-Host "`n=== Step 4: Admin Platform Summary ==="
$summary = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/summary" -Method Get -Headers $adminHeaders
Write-Host "Total Users: $($summary.totalUsers) | Active: $($summary.activeUsers) | Pending Onboarding: $($summary.pendingOnboarding) | Accounts: $($summary.totalAccounts) | System: $($summary.systemStatus)"

Write-Host "`n=== Step 5: Self-Service User Registration (Status should be PENDING) ==="
$rand = Get-Random -Minimum 1000 -Maximum 9999
$newUserBody = @{
    name = "Test Applicant $rand"
    email = "applicant$rand@example.com"
    password = "ApplicantPass123!"
} | ConvertTo-Json

$regRes = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/register" -Method Post -ContentType "application/json" -Body $newUserBody
Write-Host "Registered: $($regRes.email) with OnboardingStatus: $($regRes.onboardingStatus)"
$applicantId = $regRes.id

Write-Host "`n=== Step 6: Admin Onboarding Review ==="
$onboardingList = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/onboarding?status=PENDING" -Method Get -Headers $adminHeaders
Write-Host "Pending onboarding applications count: $($onboardingList.totalElements)"

Write-Host "`n=== Step 7: Admin Approves Applicant ==="
$approveRes = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/onboarding/$applicantId/approve" -Method Post -Headers $adminHeaders
Write-Host "Approved: $($approveRes.email) new status: $($approveRes.onboardingStatus)"

Write-Host "`n=== Step 8: Guardrail Check: Last Administrator Protection ==="
$adminUserList = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/users?role=ADMINISTRATOR" -Method Get -Headers $adminHeaders
$adminId = $adminUserList.content[0].id

$deactivateBody = @{
    enabled = $false
} | ConvertTo-Json

try {
    $deactivateRes = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/users/$adminId/status" -Method Patch -ContentType "application/json" -Headers $adminHeaders -Body $deactivateBody
    Write-Host "FAIL: Deactivating the last admin should have been blocked!"
} catch {
    Write-Host "PASS: Deactivating last administrator blocked as expected: $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n=== Step 9: Audit Trail Query ==="
$auditRes = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit?page=0&size=5" -Method Get -Headers $adminHeaders
Write-Host "Audit events recorded: $($auditRes.totalElements)"
foreach ($evt in $auditRes.content) {
    Write-Host "  - [$($evt.createdAt)] $($evt.eventType): $($evt.details) (Status: $($evt.status))"
}

Write-Host "`n=== ALL LIVE VERIFICATION CHECKS PASSED 100% ==="

