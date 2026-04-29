# Fix multiline SQL statements in phase files
# This script removes broken multiline INSERT statements

$PHASES_DIR = "C:\Users\Free user\yunix\scripts\phases"

Write-Host "Fixing multiline SQL issues in phase files..."

for ($i = 1; $i -le 10; $i++) {
    $phaseFile = "$PHASES_DIR\phase_$i.sql"
    
    if (-not (Test-Path $phaseFile)) {
        Write-Host "Phase $i not found, skipping..."
        continue
    }
    
    Write-Host "Processing phase_$i.sql..."
    
    # Read all lines
    $lines = Get-Content $phaseFile
    $fixedLines = @()
    $skipNextLine = $false
    
    for ($j = 0; $j -lt $lines.Count; $j++) {
        $line = $lines[$j]
        
        # Check if this line starts with INSERT but doesn't end with );
        if ($line -match "^INSERT INTO public\.") {
            # Check if the line is complete (ends with );
            if (-not ($line -match "\) ON CONFLICT DO NOTHING;$")) {
                # This is an incomplete line - skip it and the next line
                Write-Host "  Skipping incomplete statement at line $($j+1)"
                $skipNextLine = $true
                continue
            }
        }
        
        # Skip the continuation of a broken statement
        if ($skipNextLine) {
            # Check if this line also starts with INSERT (meaning we found the next statement)
            if ($line -match "^INSERT INTO public\.") {
                # This is a valid new statement, process it normally
                $skipNextLine = $false
            } else {
                # This is part of the broken statement, skip it
                $skipNextLine = $false
                continue
            }
        }
        
        $fixedLines += $line
    }
    
    # Write back the fixed content
    $fixedLines | Out-File -FilePath $phaseFile -Encoding utf8
    Write-Host "  Fixed phase_$i.sql - removed $($lines.Count - $fixedLines.Count) broken lines"
}

Write-Host ""
Write-Host "Done! Multiline SQL issues have been fixed."
Write-Host "Re-run the phases in Supabase SQL Editor."
