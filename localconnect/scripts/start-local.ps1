$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$phpBinary = Join-Path (Split-Path -Parent $projectRoot) '.tools\php\php.exe'
if (-not (Test-Path -LiteralPath $phpBinary)) { $phpBinary = (Get-Command php -ErrorAction Stop).Source }
$configPath = Join-Path $projectRoot 'config.local.php'
if (-not (Test-Path -LiteralPath $configPath)) {
    Write-Host 'Primero ejecutá scripts/install.php --local, según README.md.'
    exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'dist\index.html'))) {
    Push-Location $projectRoot
    try { npm run build; if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación.' } } finally { Pop-Location }
}
$env:LC_CONFIG = $configPath
Write-Host 'LocalConnect: http://127.0.0.1:8080/ . Para detener: Ctrl+C.'
& $phpBinary -S 127.0.0.1:8080 -t (Join-Path $projectRoot 'dist')
