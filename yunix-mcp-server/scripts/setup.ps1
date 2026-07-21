#!/usr/bin/env pwsh
<#
.SYNOPSIS
Yunix MCP Server Setup Script
Sets up the MCP server with proper environment configuration and credentials

.DESCRIPTION
This script:
1. Validates Node.js installation
2. Installs dependencies
3. Builds the TypeScript
4. Guides user through credential setup
5. Tests the server
#>

param(
    [string]$Mode = "http",  # stdio or http
    [int]$Port = 3000,
    [switch]$SkipBuild,
    [switch]$Test
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Write-Host "🚀 Yunix MCP Server Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js not found. Install from https://nodejs.org (v18+)" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green

# Check .env file
Write-Host ""
Write-Host "📋 Checking credentials..." -ForegroundColor Yellow
$envFile = Join-Path $projectRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "⚠️  .env file not found at $envFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please create $envFile with:" -ForegroundColor Cyan
    Write-Host @"
# Supabase project
SUPABASE_URL=https://ounphbavkyrmotskydto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-rotated-service-role-key
YUNIX_USER_ID=your-user-id

# Transport
TRANSPORT=$Mode
PORT=$Port
"@ -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "Need your Supabase Service Role Key? Follow these steps:" -ForegroundColor Cyan
    Write-Host "1. Go to https://app.supabase.com" -ForegroundColor Cyan
    Write-Host "2. Select your project" -ForegroundColor Cyan
    Write-Host "3. Go to Settings → API" -ForegroundColor Cyan
    Write-Host "4. Find 'service_role' and click the three-dot menu → Rotate key" -ForegroundColor Cyan
    Write-Host "5. Copy the new key and paste it into .env" -ForegroundColor Cyan
    Write-Host ""
    
    exit 1
} else {
    Write-Host "✓ .env file found" -ForegroundColor Green
    $envContent = Get-Content $envFile | Select-String "SUPABASE_SERVICE_ROLE_KEY|YUNIX_USER_ID"
    if ($envContent.Count -ge 2) {
        Write-Host "✓ Credentials present" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Missing required credentials in .env" -ForegroundColor Yellow
        exit 1
    }
}

# Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
Push-Location $projectRoot
npm install --silent
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Build
if (-not $SkipBuild) {
    Write-Host "🔨 Building TypeScript..." -ForegroundColor Yellow
    npm run build --silent
    Write-Host "✓ Build complete" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping build (--SkipBuild)" -ForegroundColor Gray
}

# Test
if ($Test) {
    Write-Host ""
    Write-Host "🧪 Testing server..." -ForegroundColor Yellow
    Write-Host ""
    
    # Start server in background
    $process = Start-Process node -ArgumentList "dist/index.js" -PassThru -NoNewWindow -EnvironmentVariables @{
        TRANSPORT = $Mode
        PORT = $Port
        SUPABASE_URL = (Get-Content $envFile | Select-String "^SUPABASE_URL=" | ForEach-Object { $_ -replace '^SUPABASE_URL=' } | Select-Object -First 1)
    }
    
    Start-Sleep -Seconds 2
    
    try {
        $health = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -ErrorAction Stop
        Write-Host "✓ Server health check passed" -ForegroundColor Green
        Write-Host "Response: $($health.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    } finally {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
}

# Final instructions
Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the server:" -ForegroundColor Cyan
Write-Host "  npm run start:$Mode" -ForegroundColor Gray
Write-Host ""
Write-Host "Or in development mode:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "For deployment instructions, see DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan

Pop-Location
