$ErrorActionPreference = 'Stop'

$jarName = 'car-rental-jenkins-0.0.1-SNAPSHOT.jar'
$workspace = $env:WORKSPACE

if ([string]::IsNullOrWhiteSpace($workspace)) {
    $workspace = (Get-Location).Path
}

$sourceJar = Join-Path $workspace "target\$jarName"
if (-not (Test-Path $sourceJar)) {
    throw "Packaged JAR not found: $sourceJar"
}

$deployDir = Join-Path $env:USERPROFILE 'car-rental-deployment'
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $deployDir 'data') -Force | Out-Null

$pidFile = Join-Path $deployDir 'app.pid'
if (Test-Path $pidFile) {
    $oldPid = (Get-Content $pidFile -Raw).Trim()

    if ($oldPid -match '^\d+$') {
        $oldProcess = Get-CimInstance Win32_Process `
            -Filter "ProcessId = $oldPid" -ErrorAction SilentlyContinue

        if ($oldProcess -and $oldProcess.CommandLine -and
            $oldProcess.CommandLine.Contains($jarName)) {
            Write-Output "Stopping previous car-rental deployment (PID $oldPid)."
            Stop-Process -Id ([int]$oldPid) -Force
            Start-Sleep -Seconds 2
        }
    }

    Remove-Item $pidFile -Force
}

$listener = Get-NetTCPConnection -LocalPort 8081 -State Listen `
    -ErrorAction SilentlyContinue
if ($listener) {
    throw 'Port 8081 is occupied by another process. Stop that process before deploying.'
}

$targetJar = Join-Path $deployDir $jarName
Copy-Item $sourceJar $targetJar -Force

$stdoutLog = Join-Path $deployDir 'app.log'
$stderrLog = Join-Path $deployDir 'app-error.log'
Remove-Item $stdoutLog, $stderrLog -Force -ErrorAction SilentlyContinue

$java = (Get-Command java.exe -ErrorAction Stop).Source
$arguments = @('-jar', "`"$targetJar`"", '--spring.profiles.active=demo')

$app = Start-Process -FilePath $java `
    -ArgumentList $arguments `
    -WorkingDirectory $deployDir `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

Set-Content -Path $pidFile -Value $app.Id
Write-Output "Deployment process started with PID $($app.Id)."
Write-Output "Deployment directory: $deployDir"
