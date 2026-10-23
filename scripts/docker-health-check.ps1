param(
    [string]$Url = 'http://127.0.0.1:8083/',
    [int]$MaxAttempts = 30
)

$ErrorActionPreference = 'Stop'

Write-Host "Checking Docker deployment at $Url"

for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3

        if ([int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 400) {
            Write-Host "Health check passed: HTTP $([int]$response.StatusCode)"
            exit 0
        }
    }
    catch {
        $status = 0

        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $status = [int]$_.Exception.Response.StatusCode
        }

        if ($status -eq 401 -or $status -eq 403) {
            Write-Host "Application is responding with HTTP $status; authentication is required."
            exit 0
        }

        Write-Host "Attempt $attempt/$MaxAttempts failed: $($_.Exception.Message)"
    }

    if ($attempt -lt $MaxAttempts) {
        Start-Sleep -Seconds 2
    }
}

Write-Host 'Health check failed. Container status and logs follow.'
docker ps -a --filter 'name=car-rental-jenkins-deploy'
docker logs --tail 80 car-rental-jenkins-deploy
exit 1
