Set-Location "$PSScriptRoot/frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed"; exit 1 }

Set-Location $PSScriptRoot
databricks bundle deploy
if ($LASTEXITCODE -ne 0) { Write-Error "Bundle deploy failed"; exit 1 }

databricks apps deploy rai-whatif-webapp --source-code-path /Workspace/Shared/DeployedWebApp/bundle/rai-whatif-webapp/files
