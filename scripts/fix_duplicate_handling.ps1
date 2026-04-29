# Convert INSERT statements to handle duplicates by adding ON CONFLICT DO NOTHING
$PHASES_DIR = "C:\Users\Free user\yunix\scripts\phases"

Write-Host "Fixing duplicate handling in phase files..."

for ($i = 1; $i -le 10; $i++) {
    $phaseFile = "$PHASES_DIR\phase_$i.sql"
    
    if (-not (Test-Path $phaseFile)) {
        Write-Host "Phase $i not found, skipping..."
        continue
    }
    
    Write-Host "Processing phase_$i.sql..."
    
    # Read the file
    $content = Get-Content $phaseFile -Raw
    
    # Replace INSERT INTO with INSERT INTO ... ON CONFLICT DO NOTHING
    # Handle different table names
    $tables = @(
        'trades',
        'prop_firms', 
        'account_cycles',
        'bridge_activity_logs',
        'portfolio_snapshots',
        'staff',
        'user_accounts',
        'user_roles',
        'invitation_tracking'
    )
    
    foreach ($table in $tables) {
        # Replace INSERT INTO public.table (...) VALUES (...) with INSERT INTO public.table (...) VALUES (...) ON CONFLICT DO NOTHING
        $pattern = "INSERT INTO public\.$table \([^)]+\) VALUES \([^)]+\);"
        $content = $content -replace $pattern, "INSERT INTO public.$table (`$1) VALUES (`$2) ON CONFLICT DO NOTHING;"
    }
    
    # Simple approach: Add ON CONFLICT DO NOTHING before the semicolon for each INSERT
    $lines = $content -split "`n"
    $newLines = @()
    
    foreach ($line in $lines) {
        if ($line -match "^INSERT INTO public\.") {
            # Remove trailing semicolon and add ON CONFLICT DO NOTHING
            $line = $line -replace ';$', ' ON CONFLICT DO NOTHING;'
        }
        $newLines += $line
    }
    
    # Write back
    $newContent = $newLines -join "`n"
    $newContent | Out-File -FilePath $phaseFile -Encoding utf8
    
    Write-Host "  Fixed phase_$i.sql"
}

Write-Host ""
Write-Host "Done! All phase files now handle duplicates gracefully."
Write-Host "Re-run the phases in Supabase SQL Editor."
