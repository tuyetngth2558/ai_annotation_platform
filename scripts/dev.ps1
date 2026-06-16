<#
.SYNOPSIS
  Task runner cho Windows (PowerShell) — tương đương Makefile.
.EXAMPLE
  .\scripts\dev.ps1 up
  .\scripts\dev.ps1 logs api
  .\scripts\dev.ps1 seed
#>
param(
  [Parameter(Position = 0)]
  [string]$Command = "help",

  [Parameter(Position = 1)]
  [string]$Arg = ""
)

$ErrorActionPreference = "Stop"

function Show-Help {
  Write-Host "VSF AI Annotation Platform - dev tasks" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "  up           Khoi dong stack (docker compose up -d)"
  Write-Host "  down         Dung va xoa container"
  Write-Host "  logs <svc>   Xem log mot service (vd: logs api)"
  Write-Host "  build        Build lai image"
  Write-Host "  seed         Seed 3 user mock (admin/annotator/qa)"
  Write-Host "  migrate      Chay Alembic migration moi nhat"
  Write-Host "  lint         Lint backend + frontend"
  Write-Host "  test         Chay toan bo test"
  Write-Host "  test-be      Test backend (pytest)"
  Write-Host "  test-fe      Test frontend (vitest)"
  Write-Host "  e2e          Playwright smoke test"
  Write-Host "  fmt          Format code"
}

switch ($Command) {
  "up"      { docker compose up -d }
  "down"    { docker compose down }
  "logs"    { docker compose logs -f $Arg }
  "build"   { docker compose build }
  "seed"    { docker compose exec api python /scripts/seed_dev.py }
  "migrate" { docker compose exec api alembic upgrade head }
  "lint" {
    docker compose exec api ruff check .
    docker compose exec web npm run lint
  }
  "test" {
    docker compose exec api pytest
    docker compose exec web npm run test
  }
  "test-be" { docker compose exec api pytest }
  "test-fe" { docker compose exec web npm run test }
  "e2e"     { docker compose exec web npm run e2e }
  "fmt" {
    docker compose exec api ruff format .
    docker compose exec web npm run format
  }
  default   { Show-Help }
}
