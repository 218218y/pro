[CmdletBinding()]
param(
  [string]$RoomTokenSecret = '',

  [string]$ProjectRef = 'paqzrxrvowwndevqptdk',

  [switch]$SkipSecrets,

  [switch]$SkipFunctionDeploy
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$functionPath = Join-Path $repoRoot 'supabase/functions/wp-cloud-sync-room/index.ts'
$configPath = Join-Path $repoRoot 'supabase/config.toml'

if (-not (Test-Path -LiteralPath $functionPath -PathType Leaf)) {
  throw "Missing Edge Function entrypoint: $functionPath"
}
if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
  throw "Missing Supabase config: $configPath"
}
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'npx is required. Install Node.js, then rerun this script.'
}
if (-not $SkipSecrets -and $RoomTokenSecret.Length -lt 32) {
  throw 'RoomTokenSecret must contain at least 32 characters when secrets are being set.'
}

function Invoke-SupabaseCli {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  & npx --yes supabase@latest @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase CLI failed with exit code $LASTEXITCODE"
  }
}

if (-not $SkipSecrets) {
  Write-Host 'Setting Cloud Sync Edge Function secrets...'
  Invoke-SupabaseCli -Arguments @(
    'secrets',
    'set',
    '--project-ref',
    $ProjectRef,
    "WP_CLOUD_SYNC_ROOM_TOKEN_SECRET=$RoomTokenSecret",
    'WP_CLOUD_SYNC_ORIGIN_STORES={"https://pro.bargig-furniture.com":"bargig","https://pro218.bargig-furniture.com":"bargig"}',
    'WP_CLOUD_SYNC_STORE_TENANTS={"bargig":"bargig"}',
    'WP_CLOUD_SYNC_PUBLIC_ROOMS={"bargig":"public"}',
    'WP_CLOUD_SYNC_ROOM_TOKEN_TTL_SECONDS=604800'
  )
}

if (-not $SkipFunctionDeploy) {
  Write-Host 'Deploying wp-cloud-sync-room with verify_jwt enabled...'
  Push-Location $repoRoot
  try {
    Invoke-SupabaseCli -Arguments @(
      'functions',
      'deploy',
      'wp-cloud-sync-room',
      '--project-ref',
      $ProjectRef,
      '--use-api'
    )
  } finally {
    Pop-Location
  }
}

Write-Host 'Cloud Sync secrets/function deployment completed.'
Write-Host 'Next: run tools/wp_supabase_cloud_sync_probe.ps1 before deploying the browser bundles.'
