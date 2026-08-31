[CmdletBinding()]
param(
	[Parameter()]
	[string]$Target = "dev",

	[Parameter()]
	[Alias("Profile")]
	[string]$DatabricksProfile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Target -notin @("dev", "prod")) {
	Write-Error "Invalid Target '$Target'. Allowed values: dev, prod"
	exit 1
}

$targetVars = @{
	"dev" = @{
		db_catalog   = "ta_coll"
		db_schema    = "whatif"
		cors_origins = "https://rai-whatif-webapp-2148885194133801.1.azure.databricksapps.com"
	}
	"prod" = @{
		db_catalog   = "ta_prod"
		db_schema    = "whatif"
		cors_origins = "https://rai-whatif-webapp-2743854327825858.18.azure.databricksapps.com"
	}
}

function Invoke-Databricks {
	param(
		[string[]]$CliArgs,
		[string]$FailureMessage
	)

	if ($DatabricksProfile) {
		$CliArgs += @("--profile", $DatabricksProfile)
	}

	databricks @CliArgs
	if ($LASTEXITCODE -ne 0) {
		throw $FailureMessage
	}
}

$appYamlPath = Join-Path $PSScriptRoot "app.yaml"
$originalAppYaml = Get-Content -Raw -Path $appYamlPath
$renderedAppYaml = $originalAppYaml

$renderedAppYaml = $renderedAppYaml.Replace('${var.db_catalog}', $targetVars[$Target].db_catalog)
$renderedAppYaml = $renderedAppYaml.Replace('${var.db_schema}', $targetVars[$Target].db_schema)
$renderedAppYaml = $renderedAppYaml.Replace('${var.cors_origins}', $targetVars[$Target].cors_origins)

try {
	Set-Content -Path $appYamlPath -Value $renderedAppYaml -NoNewline

	Set-Location "$PSScriptRoot/frontend"
	npm run build
	if ($LASTEXITCODE -ne 0) {
		throw "Frontend build failed"
	}

	Set-Location $PSScriptRoot
	Invoke-Databricks -CliArgs @("bundle", "deploy", "--target", $Target) -FailureMessage "Bundle deploy failed"
	Invoke-Databricks -CliArgs @("apps", "start", "rai-whatif-webapp") -FailureMessage "App start failed"
	Invoke-Databricks -CliArgs @("apps", "deploy", "--target", $Target) -FailureMessage "App deploy failed"
}
finally {
	Set-Content -Path $appYamlPath -Value $originalAppYaml -NoNewline
}
