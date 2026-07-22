# Sync Firestore subscribers → Substack (The Lazy Hustler)
# Run on your PC (cloud IPs are blocked by Substack).
# Requires: gcloud auth login, project gen-lang-client-0384486156
#
# Usage:
#   pwsh scripts/sync-substack.ps1
#   pwsh scripts/sync-substack.ps1 -Publication lazyhustler

param(
    [string]$Publication = $(if ($env:SUBSTACK_PUBLICATION) { $env:SUBSTACK_PUBLICATION } else { "lazyhustler" }),
    [string]$Project = "gen-lang-client-0384486156"
)

$ErrorActionPreference = "Stop"
$token = (gcloud auth print-access-token).Trim()
$headers = @{ Authorization = "Bearer $token" }
$listUrl = "https://firestore.googleapis.com/v1/projects/$Project/databases/(default)/documents/subscribers?pageSize=300"
$ssBase = "https://$Publication.substack.com"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

Write-Host "Fetching subscribers from $Project ..."
$r = Invoke-RestMethod -Uri $listUrl -Headers $headers
$docs = @($r.documents)
Write-Host "Found $($docs.Count) docs"

$ok = 0; $fail = 0; $skip = 0
foreach ($d in $docs) {
    $email = $d.fields.email.stringValue
    if (-not $email) { continue }
    if ($d.fields.substackSynced.booleanValue -eq $true) {
        $skip++
        continue
    }

    $body = @{
        email            = $email
        first_url        = "https://cyberscryb.com/"
        first_referrer   = ""
        current_url      = "https://cyberscryb.com/"
        current_referrer = "https://cyberscryb.com/"
    } | ConvertTo-Json -Compress

    $ssOk = $false
    $sid = $null
    $confirm = $false
    try {
        $ss = Invoke-RestMethod -Uri "$ssBase/api/v1/free" -Method POST -ContentType "application/json" -Body $body -Headers @{
            "User-Agent" = $ua
            Origin       = $ssBase
            Referer      = "$ssBase/"
            Accept       = "application/json"
        } -TimeoutSec 25
        $ssOk = $true
        $sid = $ss.subscription_id
        $confirm = [bool]$ss.requires_confirmation
        Write-Host "OK  $email"
        $ok++
    } catch {
        Write-Host "FAIL $email — $($_.Exception.Message)"
        $fail++
    }

    $fields = @{
        substackSynced      = @{ booleanValue = $ssOk }
        substackStatus      = @{ stringValue = $(if ($ssOk) { if ($confirm) { "pending_confirmation" } else { "ok" } } else { "error" }) }
        substackPublication = @{ stringValue = $Publication }
    }
    $mask = "updateMask.fieldPaths=substackSynced&updateMask.fieldPaths=substackStatus&updateMask.fieldPaths=substackPublication"
    if ($sid) {
        $fields.substackSubscriptionId = @{ stringValue = "$sid" }
        $mask += "&updateMask.fieldPaths=substackSubscriptionId"
    }
    $patchUrl = "https://firestore.googleapis.com/v1/$($d.name)?$mask"
    $patchBody = @{ fields = $fields } | ConvertTo-Json -Depth 6 -Compress
    try {
        Invoke-RestMethod -Uri $patchUrl -Method PATCH -Headers (@{
                Authorization  = "Bearer $token"
                "Content-Type" = "application/json"
            }) -Body $patchBody | Out-Null
    } catch {
        Write-Host "  (firestore mark failed) $($_.Exception.Message)"
    }

    Start-Sleep -Milliseconds 450
}

Write-Host ""
Write-Host "Done. ok=$ok fail=$fail skipped_already_synced=$skip"
Write-Host "Send newsletters from: $ssBase — Substack dashboard → Posts → Send"
