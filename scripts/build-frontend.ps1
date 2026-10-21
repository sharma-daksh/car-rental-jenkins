$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $projectRoot 'frontend'
$distDir = Join-Path $frontendDir 'dist'
$staticDir = Join-Path $projectRoot 'src\main\resources\static'

if (-not (Test-Path (Join-Path $frontendDir 'package.json'))) {
    throw "React frontend package.json was not found in $frontendDir"
}

Push-Location $frontendDir
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }

    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'React production build failed.' }
}
finally {
    Pop-Location
}

if (-not (Test-Path (Join-Path $distDir 'index.html'))) {
    throw "React production index.html was not produced in $distDir"
}

New-Item -ItemType Directory -Path $staticDir -Force | Out-Null
# Remove only the earlier plain HTML/CSS/JS files from the previous starter UI.
Remove-Item (Join-Path $staticDir 'index.html'), `
            (Join-Path $staticDir 'style.css'), `
            (Join-Path $staticDir 'app.js') -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $distDir '*') -Destination $staticDir -Recurse -Force
Write-Output "React production files copied to Spring Boot static resources: $staticDir"
