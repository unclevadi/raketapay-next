# Raketa Pay CRM - PowerShell pomoshchnik
# Iz kornya proekta:  .\scripts\crm-setup.ps1
# Nuzhno v .env.local: SUPABASE_*, NEXT_PUBLIC_SUPABASE_*, NEXT_PUBLIC_ENABLE_CRM=true

param(
    [ValidateSet("bootstrap", "dev", "all")]
    [string]$Action = "all"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Assert-AnonKey {
    $envPath = Join-Path $root ".env.local"
    if (-not (Test-Path $envPath)) {
        Write-Host "Net fayla .env.local" -ForegroundColor Red
        exit 1
    }
    $line = Get-Content $envPath | Where-Object { $_ -match "^\s*NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=" } | Select-Object -First 1
    if (-not $line) {
        Write-Host "Dobav v .env.local stroku NEXT_PUBLIC_SUPABASE_ANON_KEY=..." -ForegroundColor Red
        exit 1
    }
    $val = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
    if ([string]::IsNullOrWhiteSpace($val)) {
        Write-Host "Zapoln NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase - Settings - API - anon public)" -ForegroundColor Yellow
        exit 1
    }
}

if ($Action -eq "bootstrap" -or $Action -eq "all") {
    Write-Host ">>> npm run crm:bootstrap-user" -ForegroundColor Cyan
    npm run crm:bootstrap-user
}

if ($Action -eq "dev" -or $Action -eq "all") {
    Assert-AnonKey
    Write-Host ">>> npm run dev" -ForegroundColor Cyan
    npm run dev
}
