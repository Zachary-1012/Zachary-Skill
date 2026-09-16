param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$SetupArgs
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BaseUrl = "https://nodejs.org/dist/latest-v24.x"
$CacheBase = if ($env:LOCALAPPDATA) {
  Join-Path $env:LOCALAPPDATA "TrendHub\node24"
} else {
  Join-Path $HOME ".trendhub\node24"
}
$ForcePortable = $env:TRENHUB_BOOTSTRAP_FORCE_PORTABLE -eq "1"

function Write-Bootstrap([string]$Message) {
  Write-Host "[bootstrap] $Message"
}

function Fail-Bootstrap([string]$Message) {
  throw "[bootstrap] $Message"
}

function Get-NodeMajor([string]$NodePath) {
  try {
    return [int](& $NodePath -p 'parseInt(process.versions.node,10)')
  } catch {
    return 0
  }
}

function Invoke-Setup([string]$NodePath) {
  $nodeDir = Split-Path -Parent $NodePath
  $env:Path = "$nodeDir;$env:Path"
  $version = & $NodePath --version
  Write-Bootstrap "Using Node $version"

  & $NodePath (Join-Path $Root "scripts\setup.mjs") @SetupArgs
  $status = $LASTEXITCODE
  if ($status -ne 0) {
    exit $status
  }

  $launcher = Join-Path $Root "scripts\launcher.mjs"
  $actualNode = & $NodePath -p 'process.execPath'
  if ($LASTEXITCODE -ne 0) {
    Fail-Bootstrap "Could not resolve the active Node executable path."
  }
  $resolvedLauncher = (Resolve-Path $launcher).Path
  $result = [ordered]@{
    node = $actualNode
    launcher = $resolvedLauncher
  } | ConvertTo-Json -Compress
  Write-Output "AI_BOOTSTRAP_OK $result"
  exit 0
}

$existingNode = if ($ForcePortable) { $null } else { Get-Command node -ErrorAction SilentlyContinue }
if ($existingNode) {
  $existingPath = $existingNode.Source
  $major = Get-NodeMajor $existingPath
  if ($major -ge 22) {
    Invoke-Setup $existingPath
  }
  $oldVersion = try { & $existingPath --version } catch { "unknown" }
  Write-Bootstrap "Existing Node $oldVersion is below 22; using a verified portable Node 24 LTS for TrendHub."
} elseif ($ForcePortable) {
  Write-Bootstrap "Portable Node 24 path forced for bootstrap verification."
} else {
  Write-Bootstrap "Node.js not found; installing a verified portable Node 24 LTS for TrendHub."
}

$archName = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
switch ($archName) {
  "x64" { $arch = "x64" }
  "arm64" { $arch = "arm64" }
  default { Fail-Bootstrap "Unsupported CPU architecture: $archName. Supported: x64, arm64." }
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("trendhub-bootstrap-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
  $sumsPath = Join-Path $tempDir "SHASUMS256.txt"
  Write-Bootstrap "Reading Node 24 LTS checksums from nodejs.org"
  Invoke-WebRequest -Uri "$BaseUrl/SHASUMS256.txt" -OutFile $sumsPath -UseBasicParsing

  $pattern = "^([0-9a-fA-F]{64})\s+(node-v24\.\d+\.\d+-win-$arch\.zip)$"
  $matchLine = Get-Content $sumsPath | Where-Object { $_ -match $pattern } | Select-Object -First 1
  if (-not $matchLine) {
    Fail-Bootstrap "Could not find a Node 24 LTS archive for win-$arch."
  }
  [void]($matchLine -match $pattern)
  $expected = $Matches[1].ToLowerInvariant()
  $fileName = $Matches[2]
  $versionDir = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
  $nodeHome = Join-Path $CacheBase $versionDir
  $nodeExe = Join-Path $nodeHome "node.exe"

  if (-not (Test-Path $nodeExe)) {
    New-Item -ItemType Directory -Path $CacheBase -Force | Out-Null
    $archive = Join-Path $tempDir $fileName
    Write-Bootstrap "Downloading $fileName"
    Invoke-WebRequest -Uri "$BaseUrl/$fileName" -OutFile $archive -UseBasicParsing

    $actual = (Get-FileHash -Algorithm SHA256 -Path $archive).Hash.ToLowerInvariant()
    if ($actual -ne $expected) {
      Fail-Bootstrap "Node archive SHA-256 mismatch; refusing to execute it."
    }

    Expand-Archive -Path $archive -DestinationPath $CacheBase -Force
  }

  if (-not (Test-Path $nodeExe)) {
    Fail-Bootstrap "Portable Node runtime was not installed correctly."
  }
  $major = Get-NodeMajor $nodeExe
  if ($major -lt 22) {
    Fail-Bootstrap "Downloaded Node runtime is unexpectedly below 22."
  }

  Invoke-Setup $nodeExe
} finally {
  Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
