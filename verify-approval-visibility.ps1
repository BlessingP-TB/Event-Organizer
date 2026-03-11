$base='http://localhost:3000/api/v1'
$stamp=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$orgEmail="orgvis.$stamp@example.com"
$pwd='TestPass123'

$admin=Invoke-RestMethod -Method POST -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email='admin@smartevents.com';password='Admin@1234'}|ConvertTo-Json)
$ah=@{Authorization="Bearer $($admin.accessToken)"}

$venue=Invoke-RestMethod -Method POST -Uri "$base/admin/venues" -Headers $ah -ContentType 'application/json' -Body (@{name="V$stamp";location='Campus';capacity=80;type='HALL';rateType='PER_DAY';price=0}|ConvertTo-Json)
$venueId=$venue.id; if(-not $venueId -and $venue.data){$venueId=$venue.data.id}

Invoke-RestMethod -Method POST -Uri "$base/auth/register" -ContentType 'application/json' -Body (@{email=$orgEmail;password=$pwd;verify_password=$pwd;name='Org';role='ORGANIZER';cellphone_number='+27711234567'}|ConvertTo-Json) | Out-Null
$org=Invoke-RestMethod -Method POST -Uri "$base/auth/login" -ContentType 'application/json' -Body (@{email=$orgEmail;password=$pwd}|ConvertTo-Json)
$oh=@{Authorization="Bearer $($org.accessToken)"}

$start=(Get-Date).AddDays(6).ToString('o'); $end=(Get-Date).AddDays(6).AddHours(1).ToString('o')
$ev=Invoke-RestMethod -Method POST -Uri "$base/events" -Headers $oh -ContentType 'application/json' -Body (@{name="EV$stamp";description='x';venueId=$venueId;startDateTime=$start;endDateTime=$end;isFree=$true;expectedAttend=20}|ConvertTo-Json)
$eventId=$ev.id; if(-not $eventId -and $ev.data){$eventId=$ev.data.id}

$pending=Invoke-RestMethod -Method GET -Uri "$base/approvals?page=1&pageSize=100&status=PENDING" -Headers $ah
$arr=@(); if($pending.data){$arr=$pending.data}elseif($pending.items){$arr=$pending.items}elseif($pending -is [array]){$arr=$pending}
$ap=$arr | Where-Object { $_.targetType -eq 'Event' -and (($_.eventId -eq $eventId) -or ($_.targetId -eq $eventId)) } | Select-Object -First 1
if(-not $ap){ throw "No pending event approval found for $eventId" }

Invoke-RestMethod -Method PATCH -Uri "$base/approvals/$($ap.id)" -Headers $ah -ContentType 'application/json' -Body (@{status='APPROVED';notes='ok'}|ConvertTo-Json) | Out-Null

$event=Invoke-RestMethod -Method GET -Uri "$base/events/$eventId" -Headers $ah
$pub=Invoke-RestMethod -Method GET -Uri "$base/events/public?page=1&pageSize=100"
$p=@(); if($pub.data){$p=$pub.data}elseif($pub.items){$p=$pub.items}elseif($pub -is [array]){$p=$pub}
$visible=[bool]($p|Where-Object id -eq $eventId)
"event_status=$($event.status) visible_public=$visible event_id=$eventId approval_id=$($ap.id)"
