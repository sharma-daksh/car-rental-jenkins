$ErrorActionPreference = 'Stop'

$url = 'http://127.0.0.1:8081/api/cars'

for ($attempt = 1; $attempt -le 30; $attempt++) {
    $status = $null

    try {
        $request = [System.Net.HttpWebRequest]::Create($url)
        $request.Method = 'GET'
        $request.Timeout = 3000

        $response = $request.GetResponse()
        $status = [int]$response.StatusCode
        $response.Close()
    }
    catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            $_.Exception.Response.Close()
        }
    }

    if ($null -ne $status -and
        (($status -ge 200 -and $status -lt 400) -or
         $status -eq 401 -or $status -eq 403)) {
        Write-Output "HTTP availability check passed. Server responded with status $status."
        if ($status -eq 401 -or $status -eq 403) {
            Write-Output 'The API is protected by Spring Security; this confirms responsiveness, not an authenticated business operation.'
        }
        exit 0
    }

    Start-Sleep -Seconds 2
}

$deployDir = Join-Path $env:USERPROFILE 'car-rental-deployment'
Write-Output 'Health check failed. Application logs follow:'
Get-Content (Join-Path $deployDir 'app.log') -ErrorAction SilentlyContinue
Get-Content (Join-Path $deployDir 'app-error.log') -ErrorAction SilentlyContinue
throw "Application did not return a healthy HTTP response from $url."
