param(
  [string]$Message = "update"
)

# Ir a la carpeta del proyecto (por si lo llamas desde fuera)
Set-Location $PSScriptRoot

Write-Host "➡ Commit y push a GitHub..." -ForegroundColor Cyan
git add .
git commit -m $Message
git push

Write-Host "➡ Build de producción..." -ForegroundColor Cyan
npm run build

Write-Host "➡ Subiendo a igoded.es..." -ForegroundColor Cyan
scp -r dist\* igoded@168.231.80.55:/home/igoded/domains/igoded.es/public_html/ 

Write-Host "✅ Deploy completado" -ForegroundColor Green