[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$AnonKey,

  [string]$ProjectRef = 'paqzrxrvowwndevqptdk',

  [switch]$IncludeWriteProbe
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$AnonKey = $AnonKey.Trim()
if ($AnonKey -notmatch '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') {
  throw 'AnonKey must be the legacy anon JWT itself (three dot-separated segments), not a command or an sb_publishable key.'
}

$gatewayUrl = "https://$ProjectRef.supabase.co/functions/v1/wp-cloud-sync-room"
$mainOrigin = 'https://pro.bargig-furniture.com'
$customerOrigin = 'https://pro218.bargig-furniture.com'

function Invoke-GatewayRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Origin,
    [Parameter(Mandatory = $true)][hashtable]$Body
  )

  $headers = @{
    Origin = $Origin
    apikey = $AnonKey
    Authorization = "Bearer $AnonKey"
    Accept = 'application/json'
  }
  $json = $Body | ConvertTo-Json -Compress -Depth 20
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $gatewayUrl -Method Post -Headers $headers `
      -ContentType 'application/json' -Body $json
    return [pscustomobject]@{
      Status = [int]$response.StatusCode
      Headers = $response.Headers
      Body = $response.Content | ConvertFrom-Json
    }
  } catch {
    $response = $_.Exception.Response
    if (-not $response) { throw }
    $content = ''
    $contentProperty = $response.PSObject.Properties['Content']
    if ($contentProperty -and $null -ne $response.Content) {
      $responseContent = $response.Content
      if ($responseContent -is [string]) {
        $content = $responseContent
      } elseif ($responseContent.PSObject.Methods['ReadAsStringAsync']) {
        $contentTask = $responseContent.ReadAsStringAsync()
        $content = $contentTask.GetAwaiter().GetResult()
      }
    }
    if (-not $content -and $response.PSObject.Methods['GetResponseStream']) {
      $stream = $response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      try {
        $content = $reader.ReadToEnd()
      } finally {
        $reader.Dispose()
        $stream.Dispose()
      }
    }
    $responseBody = if ([string]::IsNullOrWhiteSpace($content)) {
      [pscustomobject]@{}
    } else {
      try {
        $content | ConvertFrom-Json
      } catch {
        [pscustomobject]@{ raw = $content }
      }
    }
    return [pscustomobject]@{
      Status = [int]$response.StatusCode
      Headers = $response.Headers
      Body = $responseBody
    }
  }
}

function Assert-GatewayResult {
  param(
    [Parameter(Mandatory = $true)]$Result,
    [Parameter(Mandatory = $true)][int]$Status,
    [string]$Code = ''
  )

  if ($Result.Status -ne $Status) {
    $actualCode = if ($Result.Body.PSObject.Properties['code']) {
      [string]$Result.Body.code
    } else {
      ''
    }
    $requestId = if ($Result.Body.PSObject.Properties['requestId']) {
      [string]$Result.Body.requestId
    } else {
      ''
    }
    $codeSuffix = if ($actualCode) { " (code '$actualCode')" } else { '' }
    $requestSuffix = if ($requestId) { " (requestId '$requestId')" } else { '' }
    $logHint = if ($actualCode -eq 'internal' -and $requestId) {
      ' Inspect Dashboard -> Edge Functions -> wp-cloud-sync-room -> Logs and search for that requestId.'
    } else {
      ''
    }
    throw "Expected HTTP $Status but received $($Result.Status)$codeSuffix$requestSuffix.$logHint"
  }
  if ($Code) {
    $actualCode = if ($Result.Body.PSObject.Properties['code']) {
      [string]$Result.Body.code
    } else {
      ''
    }
    if ($actualCode -ne $Code) {
      throw "Expected code '$Code' but received '$actualCode'"
    }
  }
}

foreach ($origin in @($mainOrigin, $customerOrigin)) {
  $public = Invoke-GatewayRequest -Origin $origin -Body @{ action = 'issue-public'; storeId = 'bargig' }
  Assert-GatewayResult -Result $public -Status 200
  if (-not $public.Body.credential.token -or -not $public.Body.credential.expiresAt) {
    throw "issue-public returned an incomplete credential for $origin"
  }
  Write-Host "PASS issue-public $origin"
}

$blockedOrigin = Invoke-GatewayRequest -Origin 'https://blocked.invalid' -Body @{
  action = 'issue-public'
  storeId = 'bargig'
}
Assert-GatewayResult -Result $blockedOrigin -Status 403 -Code 'origin'
Write-Host 'PASS blocked origin'

$created = Invoke-GatewayRequest -Origin $mainOrigin -Body @{ action = 'create-room'; storeId = 'bargig' }
Assert-GatewayResult -Result $created -Status 201
$credential = $created.Body.credential
if (-not $credential.room -or -not $credential.token -or -not $credential.expiresAt) {
  throw 'create-room returned an incomplete credential'
}
Write-Host 'PASS create-room'

$read = Invoke-GatewayRequest -Origin $mainOrigin -Body @{
  action = 'read'
  storeId = 'bargig'
  room = [string]$credential.room
  roomToken = [string]$credential.token
}
Assert-GatewayResult -Result $read -Status 200
Write-Host 'PASS signed read'

if ($IncludeWriteProbe) {
  $clientId = "probe-$([guid]::NewGuid().ToString('N'))"
  $probePayload = @{
    probe = @{
      clientId = $clientId
      createdAt = [DateTimeOffset]::UtcNow.ToString('O')
    }
  }
  $write = Invoke-GatewayRequest -Origin $mainOrigin -Body @{
    action = 'write'
    storeId = 'bargig'
    room = [string]$credential.room
    roomToken = [string]$credential.token
    payload = $probePayload
    expectedRevision = 0
    clientId = $clientId
  }
  Assert-GatewayResult -Result $write -Status 200
  if ([int64]$write.Body.row.revision -lt 1) {
    throw 'write probe did not return a valid revision'
  }
  Write-Host 'PASS signed write'

  $conflict = Invoke-GatewayRequest -Origin $mainOrigin -Body @{
    action = 'write'
    storeId = 'bargig'
    room = [string]$credential.room
    roomToken = [string]$credential.token
    payload = $probePayload
    expectedRevision = 0
    clientId = $clientId
  }
  Assert-GatewayResult -Result $conflict -Status 409 -Code 'revision_conflict'
  if ([int64]$conflict.Body.row.revision -ne [int64]$write.Body.row.revision) {
    throw 'revision conflict did not return the current row'
  }
  Write-Host 'PASS stale-revision conflict'
}

$renewed = Invoke-GatewayRequest -Origin $mainOrigin -Body @{
  action = 'renew-room'
  storeId = 'bargig'
  room = [string]$credential.room
  roomToken = [string]$credential.token
}
Assert-GatewayResult -Result $renewed -Status 200
if ([string]$renewed.Body.credential.room -ne [string]$credential.room) {
  throw 'renew-room changed the base room'
}
Write-Host 'PASS renew-room'

$tampered = Invoke-GatewayRequest -Origin $mainOrigin -Body @{
  action = 'read'
  storeId = 'bargig'
  room = [string]$credential.room
  roomToken = "$($credential.token)x"
}
Assert-GatewayResult -Result $tampered -Status 403 -Code 'room_token'
Write-Host 'PASS tampered token rejection'

if ($IncludeWriteProbe) {
  Write-Host 'All Cloud Sync gateway probes passed. One isolated probe row remains in the generated private room.'
} else {
  Write-Host 'All non-mutating Cloud Sync gateway probes passed.'
}
