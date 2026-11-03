# Starts Meal Planner in a dedicated Edge app window and stops its local
# Vite and API servers when that window is closed.

$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$websiteUrl = "http://127.0.0.1:5173"
$apiUrl = "http://127.0.0.1:3000"
$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$browserProfile = Join-Path $env:TEMP "meal-planner-edge-profile"
$websiteProcess = $null
$apiProcess = $null

function Test-LocalUrl([string] $url) {
  try {
    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Wait-ForLocalUrl([string] $url, [string] $serviceName) {
  for ($attempt = 1; $attempt -le 20; $attempt++) {
    if (Test-LocalUrl $url) {
      return
    }
    Start-Sleep -Milliseconds 500
  }
  throw "$serviceName did not start at $url."
}

function Stop-StartedProcess($process) {
  if ($null -eq $process) {
    return
  }

  # /T also stops the Node.js child created by npm.cmd.
  & taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null
}

if (-not (Test-Path $edgePath)) {
  throw "Microsoft Edge was not found at $edgePath."
}

# If a previous Meal Planner run did not close cleanly, replace its local
# website/API processes so this launcher remains responsible for shutdown.
$runningProcessIds = netstat -ano |
  Select-String ":(3000|5173)\s+.*LISTENING" |
  ForEach-Object { ($_.Line -split "\s+")[-1] } |
  Select-Object -Unique

foreach ($runningProcessId in $runningProcessIds) {
  if ($runningProcessId -match "^\d+$") {
    & taskkill.exe /PID $runningProcessId /T /F 2>$null | Out-Null
  }
}

try {
  Write-Host "Starting the Meal Planner API..."
  $apiProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "server" -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
  Write-Host "Starting the Meal Planner website..."
  $websiteProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "start", "--", "--host", "127.0.0.1", "--strictPort" -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru

  Wait-ForLocalUrl $apiUrl "The Meal Planner API"
  Wait-ForLocalUrl $websiteUrl "The Meal Planner website"

  # A separate Edge profile creates one dedicated window/process that can be
  # watched. Close that Meal Planner window to run the cleanup below.
  Write-Host "Opening Meal Planner in Edge..."
  $edgeProcess = Start-Process -FilePath $edgePath -ArgumentList "--app=$websiteUrl", "--new-window", "--start-maximized", "--user-data-dir=$browserProfile" -WindowStyle Maximized -PassThru
  Write-Host "Meal Planner is open. Close its Edge window to stop the local servers."

  # Edge starts a short-lived launcher process, then hands the app window to
  # child processes. Watch the processes using this dedicated profile instead
  # of the launcher PID, so Vite is not stopped before the page loads.
  # Edge can need a few seconds before that child process appears.
  $mealPlannerEdge = $null
  for ($attempt = 1; $attempt -le 20; $attempt++) {
    $mealPlannerEdge = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
      Where-Object { $_.CommandLine -like "*$browserProfile*" }
    if ($mealPlannerEdge) {
      break
    }
    Start-Sleep -Milliseconds 500
  }

  if (-not $mealPlannerEdge) {
    throw "Edge opened but its dedicated Meal Planner window could not be detected."
  }

  do {
    $mealPlannerEdge = Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" |
      Where-Object { $_.CommandLine -like "*$browserProfile*" }
    if ($mealPlannerEdge) {
      Start-Sleep -Seconds 1
    }
  } while ($mealPlannerEdge)
} finally {
  Stop-StartedProcess $websiteProcess
  Stop-StartedProcess $apiProcess
}
