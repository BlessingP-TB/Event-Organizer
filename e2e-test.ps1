$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api/v1'
$port = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
if (-not $port.TcpTestSucceeded) { throw 'Backend is not running on port 3000' }

function Invoke-Api {
  param([string]$Method,[string]$Url,$Body,[string]$Token)
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  if ($null -ne $Body) {
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 8)
  }
  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$organizerEmail = "organizer.$stamp@example.com"
$attendeeEmail = "attendee.$stamp@example.com"
$password = 'TestPass123'
$results = [ordered]@{}

$adminLogin = Invoke-Api -Method 'POST' -Url "$base/auth/login" -Body @{ email='admin@smartevents.com'; password='Admin@1234' }
$adminToken = $adminLogin.accessToken
$results['admin_login'] = [bool]$adminToken

$venueName = "E2E Venue $stamp"
$venueResp = Invoke-Api -Method 'POST' -Url "$base/admin/venues" -Token $adminToken -Body @{ name=$venueName; location='Main Campus'; capacity=300; type='HALL'; rateType='PER_DAY'; price=0 }
$venueId = $venueResp.id; if (-not $venueId -and $venueResp.data) { $venueId = $venueResp.data.id }
$results['admin_create_venue'] = [bool]$venueId

$null = Invoke-Api -Method 'POST' -Url "$base/auth/register" -Body @{ email=$organizerEmail; password=$password; verify_password=$password; name='E2E Organizer'; role='ORGANIZER'; cellphone_number='+27711234567' }
$null = Invoke-Api -Method 'POST' -Url "$base/auth/register" -Body @{ email=$attendeeEmail; password=$password; verify_password=$password; name='E2E Attendee'; role='ATTENDEE'; cellphone_number='' }
$results['organizer_register'] = $true
$results['attendee_register'] = $true

$orgLogin = Invoke-Api -Method 'POST' -Url "$base/auth/login" -Body @{ email=$organizerEmail; password=$password }
$orgToken = $orgLogin.accessToken
$results['organizer_login'] = [bool]$orgToken

$start = (Get-Date).AddDays(2).ToString('o')
$end = (Get-Date).AddDays(2).AddHours(3).ToString('o')
$eventResp = Invoke-Api -Method 'POST' -Url "$base/events" -Token $orgToken -Body @{ name = "E2E Event $stamp"; description = 'End-to-end flow test event'; venueId = $venueId; startDateTime = $start; endDateTime = $end; isFree = $true; expectedAttend = 50 }
$eventId = $eventResp.id; if (-not $eventId -and $eventResp.data) { $eventId = $eventResp.data.id }
$results['organizer_create_event'] = [bool]$eventId

$apprList = Invoke-Api -Method 'GET' -Url "$base/approvals" -Token $adminToken
$apprs = @(); if ($apprList.data) { $apprs = $apprList.data } elseif ($apprList.items) { $apprs = $apprList.items } elseif ($apprList -is [array]) { $apprs = $apprList }
$targetApproval = $apprs | Where-Object { $_.eventId -eq $eventId -or $_.targetId -eq $eventId } | Select-Object -First 1
if ($targetApproval) {
  $approvalId = $targetApproval.id
  $null = Invoke-Api -Method 'PATCH' -Url "$base/approvals/$approvalId" -Token $adminToken -Body @{ status='APPROVED'; notes='E2E approved by admin' }
  $results['admin_approve_event'] = $true
} else {
  $results['admin_approve_event'] = $false
}

$attLogin = Invoke-Api -Method 'POST' -Url "$base/auth/login" -Body @{ email=$attendeeEmail; password=$password }
$attToken = $attLogin.accessToken
$results['attendee_login'] = [bool]$attToken

$publicEvents = Invoke-Api -Method 'GET' -Url "$base/events/public?page=1&pageSize=50"
$pubItems = @(); if ($publicEvents.data) { $pubItems = $publicEvents.data } elseif ($publicEvents.items) { $pubItems = $publicEvents.items } elseif ($publicEvents -is [array]) { $pubItems = $publicEvents }
$seen = $pubItems | Where-Object { $_.id -eq $eventId } | Select-Object -First 1
$results['attendee_can_see_event_public'] = [bool]$seen

$regOk = $false
try {
  $null = Invoke-Api -Method 'POST' -Url "$base/registrations/$eventId" -Token $attToken -Body @{}
  $regOk = $true
} catch {
  $regOk = $false
  $results['attendee_register_error'] = $_.Exception.Message
}
$results['attendee_register_event'] = $regOk

$results['event_id'] = $eventId
$results['venue_id'] = $venueId
$results['organizer_email'] = $organizerEmail
$results['attendee_email'] = $attendeeEmail

$results | ConvertTo-Json -Depth 8 | Set-Content "C:\Users\kamog\Downloads\smartevents-attendee\smartevents-Sonia\e2e-result.json"
Write-Output "E2E done"
