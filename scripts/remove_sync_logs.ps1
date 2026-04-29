# Remove all sync_logs INSERT statements from all phase files
$PHASES_DIR = "C:\Users\Free user\yunix\scripts\phases"

Write-Host "Removing sync_logs INSERT statements from all phase files..."

$totalRemoved = 0

for ($i = 1; $i -le 10; $i++) {
    $phaseFile = "$PHASES_DIR\phase_$i.sql"
    
    if (-not (Test-Path $phaseFile)) {
        Write-Host "Phase $i not found, skipping..."
        continue
    }
    
    # Read and filter lines
    $lines = Get-Content $phaseFile
    $originalCount = $lines.Count
    $filteredLines = $lines | Where-Object { $_ -notmatch "INSERT INTO public\.sync_logs" }
    $removedCount = $originalCount - $filteredLines.Count
    $totalRemoved += $removedCount
    
    # Write back
    $filteredLines | Out-File -FilePath $phaseFile -Encoding utf8
    
    Write-Host "  phase_$i.sql - removed $removedCount sync_logs statements"
}

Write-Host ""
Write-Host "Done! Removed $totalRemoved sync_logs INSERT statements total."
Write-Host "Re-run the phases in Supabase SQL Editor."
