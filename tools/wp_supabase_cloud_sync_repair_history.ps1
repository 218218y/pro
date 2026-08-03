[CmdletBinding()]
param(
  [string]$ProjectRef = 'paqzrxrvowwndevqptdk',

  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$linkedProjectRefPath = Join-Path $repoRoot 'supabase/.temp/project-ref'
$expectedMigrations = @(
  [pscustomobject]@{
    Version = '20260713110031'
    File = 'supabase/migrations/20260713110031_signed_room_cloud_sync_schema.sql'
    CanonicalSource = 'docs/supabase_cloud_sync.sql'
    Repair = $false
  },
  [pscustomobject]@{
    Version = '20260713110043'
    File = 'supabase/migrations/20260713110043_copy_legacy_cloud_sync_rows.sql'
    CanonicalSource = 'docs/supabase_cloud_sync_multi_store.sql'
    Repair = $false
  },
  [pscustomobject]@{
    Version = '20260713110150'
    File = 'supabase/migrations/20260713110150_tighten_cloud_sync_service_role_privileges.sql'
    CanonicalSource = 'docs/supabase_cloud_sync_legacy_lockdown.sql'
    Repair = $false
  },
  [pscustomobject]@{
    Version = '202607160001'
    File = 'supabase/migrations/202607160001_cloud_sync_retention.sql'
    CanonicalSource = $null
    Repair = $true
  },
  [pscustomobject]@{
    Version = '202607160002'
    File = 'supabase/migrations/202607160002_cloud_sync_room_expiry.sql'
    CanonicalSource = $null
    Repair = $true
  }
)

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'npx is required. Install Node.js, then rerun this script.'
}

foreach ($migration in $expectedMigrations) {
  $migrationPath = Join-Path $repoRoot $migration.File
  if (-not (Test-Path -LiteralPath $migrationPath -PathType Leaf)) {
    throw "Missing migration file: $migrationPath"
  }

  if ($migration.CanonicalSource) {
    $canonicalPath = Join-Path $repoRoot $migration.CanonicalSource
    if (-not (Test-Path -LiteralPath $canonicalPath -PathType Leaf)) {
      throw "Missing canonical SQL source: $canonicalPath"
    }

    $migrationHash = (Get-FileHash -LiteralPath $migrationPath -Algorithm SHA256).Hash
    $canonicalHash = (Get-FileHash -LiteralPath $canonicalPath -Algorithm SHA256).Hash
    if ($migrationHash -ne $canonicalHash) {
      throw "Historical migration differs from its canonical SQL source: $($migration.File)"
    }
  }
}

if (-not (Test-Path -LiteralPath $linkedProjectRefPath -PathType Leaf)) {
  throw @"
Supabase CLI is not linked from this repository. Run:
  npx --yes supabase@latest login
  npx --yes supabase@latest link --project-ref $ProjectRef
Then rerun this script.

Note: supabase/.temp/linked-project.json is project metadata only. The CLI requires
supabase/.temp/project-ref, which is created by the supabase link command.
"@
}

$linkedProjectRef = (Get-Content -LiteralPath $linkedProjectRefPath -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($linkedProjectRef)) {
  throw "Supabase CLI link file is empty: $linkedProjectRefPath"
}
if ($linkedProjectRef -ne $ProjectRef) {
  throw "Linked Supabase project '$linkedProjectRef' does not match required project '$ProjectRef'."
}

function Invoke-SupabaseCli {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  # Windows PowerShell 5.1 converts native stderr into ErrorRecord objects.
  # Supabase CLI writes progress messages such as "Initialising login role..."
  # to stderr even when the command succeeds. Temporarily use Continue so those
  # messages can be captured; the native process exit code remains authoritative.
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $rawOutput = @(& npx --yes supabase@latest @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  $output = @(
    $rawOutput | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        [string]$_.Exception.Message
      } else {
        [string]$_
      }
    }
  )

  foreach ($line in $output) {
    Write-Host $line
  }
  if ($exitCode -ne 0) {
    throw "Supabase CLI failed with exit code $exitCode"
  }
  return $output
}

function Test-MigrationApplied {
  param(
    [Parameter(Mandatory = $true)][string[]]$MigrationList,
    [Parameter(Mandatory = $true)][string]$Version
  )

  $escapedVersion = [regex]::Escape($Version)
  foreach ($line in $MigrationList) {
    $versionOccurrences = [regex]::Matches(
      [string]$line,
      "(?<!\d)$escapedVersion(?!\d)"
    )
    if ($versionOccurrences.Count -ge 2) {
      return $true
    }
  }
  return $false
}

$previousNoColor = $env:NO_COLOR
$env:NO_COLOR = '1'
try {
  Write-Host "Checking migration history for linked project $ProjectRef..."
  $before = Invoke-SupabaseCli -Arguments @('migration', 'list', '--linked')

  foreach ($migration in $expectedMigrations) {
    if (-not ($before -match [regex]::Escape($migration.Version))) {
      throw "Migration $($migration.Version) is not visible in the local/remote migration list."
    }
  }

  $missingRepairVersions = @(
    $expectedMigrations |
      Where-Object { $_.Repair -and -not (Test-MigrationApplied -MigrationList $before -Version $_.Version) } |
      ForEach-Object { $_.Version }
  )

  if ($missingRepairVersions.Count -eq 0) {
    Write-Host 'Cloud Sync migration history is already synchronized.'
    Invoke-SupabaseCli -Arguments @('db', 'push', '--linked', '--dry-run') | Out-Null
    return
  }

  if (-not $Apply) {
    Write-Host ''
    Write-Host "History repair is required for: $($missingRepairVersions -join ', ')"
    Write-Host 'The remote schema must already contain these migrations before they are marked applied.'
    Write-Host 'Run the read-only retention verification SQL, then execute:'
    Write-Host '  .\tools\wp_supabase_cloud_sync_repair_history.ps1 -Apply'
    return
  }

  Write-Host ''
  Write-Host 'Repairing migration history only; no migration SQL will be executed...'
  foreach ($version in $missingRepairVersions) {
    Invoke-SupabaseCli -Arguments @(
      'migration',
      'repair',
      $version,
      '--status',
      'applied',
      '--linked'
    ) | Out-Null
  }

  Write-Host ''
  Write-Host 'Verifying repaired history...'
  $after = Invoke-SupabaseCli -Arguments @('migration', 'list', '--linked')
  foreach ($migration in $expectedMigrations) {
    if (-not (Test-MigrationApplied -MigrationList $after -Version $migration.Version)) {
      throw "Migration history verification failed for $($migration.Version)."
    }
  }

  Write-Host ''
  Write-Host 'Checking that no migration SQL remains pending...'
  Invoke-SupabaseCli -Arguments @('db', 'push', '--linked', '--dry-run') | Out-Null
  Write-Host 'Cloud Sync migration history repair completed successfully.'
} finally {
  $env:NO_COLOR = $previousNoColor
}
