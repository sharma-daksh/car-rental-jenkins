param(
    [Parameter(Mandatory = $true)]
    [string]$ImageTag
)

$ErrorActionPreference = 'Stop'

$image = "localhost:5000/car-rental-jenkins:$ImageTag"
$containerName = 'car-rental-jenkins-deploy'
$volumeName = 'car-rental-jenkins-data'

Write-Host "Pulling image: $image"
docker pull $image
if ($LASTEXITCODE -ne 0) {
    throw "Failed to pull Docker image: $image"
}

Write-Host "Ensuring persistent database volume exists."
docker volume create $volumeName
if ($LASTEXITCODE -ne 0) {
    throw "Failed to create or access volume: $volumeName"
}

$existing = docker ps -aq --filter "name=$containerName"
if ($LASTEXITCODE -ne 0) {
    throw 'Could not inspect the previous deployment.'
}

if ($existing) {
    Write-Host "Replacing previous Jenkins-managed container: $containerName"
    docker rm -f $containerName
    if ($LASTEXITCODE -ne 0) {
        throw 'Failed to remove the previous Jenkins-managed container.'
    }
}

Write-Host 'Starting the new container on host port 8083.'
docker run -d --name $containerName --restart unless-stopped -p 8083:8081 -v "${volumeName}:/app/data" $image
if ($LASTEXITCODE -ne 0) {
    throw 'Docker container deployment failed.'
}

Write-Host 'Docker container deployment command completed.'
