# Remove all system_settings INSERT statements from all phase files
$PHASES_DIR = "C:\Users\Free user\yunix\scripts\phases"

Write-Host "Removing system_settings INSERT statements from all phase files..."

$totalRemoved = 0

for ($i = 1; $i -le 10; $i++) {
    $phaseFile = "$PHASES_DIR\phase_$i.sql"
    
    if (-not (Test-Path $phaseFile)) {
        continue
    }
    
    # Read and filter lines
    $lines = Get-Content $phaseFile
    $originalCount = $lines.Count
    $filteredLines = $lines | Where-Object { $_ -notmatch "INSERT INTO public\.system_settings" }
    $removedCount = $originalCount - $filteredLines.Count
    $totalRemoved += $removedCount
    
    # Write back
    $filteredLines | Out-File -FilePath $phaseFile -Encoding utf8
    
    if ($removedCount -gt 0) {
        Write-Host "  phase_$i.sql - removed $removedCount system_settings statements"
    }
}

Write-Host ""
Write-Host "Done! Removed $totalRemoved system_settings INSERT statements total."
Write-Host "Re-run the phases in Supabase SQL Editor."
