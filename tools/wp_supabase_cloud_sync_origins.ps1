[CmdletBinding()]
param(
  [string]$ProjectRef = 'paqzrxrvowwndevqptdk',

  [ValidateSet('Development', 'Production')]
  [string]$Environment = 'Development'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$originConfigToolPath = Join-Path $repoRoot 'tools/wp_cloud_sync_origin_config.mjs'

if (-not (Test-Path -LiteralPath $originConfigToolPath -PathType Leaf)) {
  throw "Missing Cloud Sync origin config tool: $originConfigToolPath"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js is required.'
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'npx is required. Install Node.js, then rerun this script.'
}

$environmentName = $Environment.ToLowerInvariant()
$originStoresOutput = & node $originConfigToolPath '--environment' $environmentName
if ($LASTEXITCODE -ne 0) {
  throw "Cloud Sync origin config validation failed with exit code $LASTEXITCODE"
}
$originStoresJson = ($originStoresOutput -join [Environment]::NewLine).Trim()
if ([string]::IsNullOrWhiteSpace($originStoresJson)) {
  throw 'Cloud Sync origin config tool returned an empty value.'
}

$tempEnvPath = Join-Path ([System.IO.Path]::GetTempPath()) (
  'wp-cloud-sync-origins-' + [Guid]::NewGuid().ToString('N') + '.env'
)

try {
  $envFileContent = "WP_CLOUD_SYNC_ORIGIN_STORES=$originStoresJson`n"
  [System.IO.File]::WriteAllText(
    $tempEnvPath,
    $envFileContent,
    [System.Text.UTF8Encoding]::new($false)
  )

  Write-Host "Setting WP_CLOUD_SYNC_ORIGIN_STORES for $Environment mode..."
  & npx --yes supabase@latest secrets set `
    '--project-ref' $ProjectRef `
    '--env-file' $tempEnvPath

  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI failed with exit code $LASTEXITCODE"
  }
} finally {
  Remove-Item -LiteralPath $tempEnvPath -Force -ErrorAction SilentlyContinue
}

if ($Environment -eq 'Development') {
  Write-Host 'Development origins are enabled together with all production origins.'
  Write-Host 'Main:  http://localhost:5173'
  Write-Host 'Site2: http://localhost:5174'
} else {
  Write-Host 'Only production origins are enabled.'
}
Write-Host 'The room-token secret was not changed and the Edge Function does not need redeployment.'
