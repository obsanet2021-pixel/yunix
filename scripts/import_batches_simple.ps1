# Simple batch import script
$PROJECT_REF = "ounphbavkyrmotskydto"
$BATCH_DIR = "C:\Users\Free user\yunix\scripts\batches"
$PROGRESS_FILE = "C:\Users\Free user\yunix\scripts\import_progress.txt"

Write-Host "Starting batch import..."

# Get completed batches
$completed = @()
if (Test-Path $PROGRESS_FILE) {
    $completed = Get-Content $PROGRESS_FILE
}

# Get batches 29-201
$batchFiles = Get-ChildItem "$BATCH_DIR\batch_*.sql" | 
    Where-Object { 
        $num = [int]($_.Name -replace 'batch_(\d+)\.sql','$1')
        $num -ge 29 -and $num -le 201 -and $_.Name -notin $completed
    } |
    Sort-Object { [int]($_.Name -replace 'batch_(\d+)\.sql','$1') }

Write-Host "Found $($batchFiles.Count) batches to import"

$imported = 0
$failed = 0

foreach ($file in $batchFiles) {
    $name = $file.Name
    Write-Host "Importing $name..."
    
    # Use supabase CLI
    $result = & npx supabase db execute --project-ref $PROJECT_REF --file $file.FullName 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Add-Content $PROGRESS_FILE $name
        $imported++
        Write-Host "  ✓ Success"
    } else {
        $failed++
        Write-Host "  ✗ Failed: $result"
    }
    
    # Progress every 10
    if ($imported % 10 -eq 0) {
        Write-Host "Progress: $imported imported, $failed failed"
    }
}

Write-Host ""
Write-Host "=== IMPORT COMPLETE ==="
Write-Host "Imported: $imported"
Write-Host "Failed: $failed"
Write-Host "Total completed: $($completed.Count + $imported)"
