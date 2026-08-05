[CmdletBinding()]
param(
	[Parameter()]
	[string]$Target = "dev",

	[Parameter()]
	[string]$Profile
)

Set-Location "$PSScriptRoot/frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed"; exit 1 }

Set-Location $PSScriptRoot
$bundleArgs = @("bundle", "deploy", "--target", $Target)
if ($Profile) {
	$bundleArgs += @("--profile", $Profile)
}

databricks @bundleArgs
if ($LASTEXITCODE -ne 0) { Write-Error "Bundle deploy failed"; exit 1 }

$startArgs = @("apps", "start", "rai-whatif-webapp")
if ($Profile) {
	$startArgs += @("--profile", $Profile)
}

databricks @startArgs
if ($LASTEXITCODE -ne 0) { Write-Error "App start failed"; exit 1 }

$appsArgs = @(
	"apps",
	"deploy",
	"rai-whatif-webapp",
	"--source-code-path",
	"/Workspace/Shared/DeployedWebApp/bundle/rai-whatif-webapp/files"
)
if ($Profile) {
	$appsArgs += @("--profile", $Profile)
}

databricks @appsArgs
if ($LASTEXITCODE -ne 0) { Write-Error "App deploy failed"; exit 1 }
