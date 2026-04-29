# Import remaining SQL batches into Supabase
# Project ref: ounphbavkyrmotskydto

$PROJECT_REF = "ounphbavkyrmotskydto"
$BATCH_DIR = "C:\Users\Free user\yunix\scripts\batches"
$PROGRESS_FILE = "C:\Users\Free user\yunix\scripts\import_progress.txt"
$LOG_FILE = "C:\Users\Free user\yunix\scripts\import_log.txt"

# Get Supabase CLI path
$SUPABASE_CLI = "npx"

function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    Write-Host $logEntry
    Add-Content -Path $LOG_FILE -Value $logEntry
}

# Read progress
$completedBatches = @()
if (Test-Path $PROGRESS_FILE) {
    $completedBatches = Get-Content $PROGRESS_FILE
    Write-Log "Found $($completedBatches.Count) previously completed batches"
}

# Get all batch files sorted numerically
$allBatches = Get-ChildItem -Path "$BATCH_DIR\batch_*.sql" | 
    Sort-Object { [int]($_.Name -replace 'batch_(\d+)\.sql','$1') }

Write-Log "Found $($allBatches.Count) total batch files"

# Filter to batches 29-201 (skip already completed)
$batchesToProcess = $allBatches | Where-Object { 
    $batchNum = [int]($_.Name -replace 'batch_(\d+)\.sql','$1')
    $batchNum -ge 29 -and $batchNum -le 201 -and $_.Name -notin $completedBatches
}

Write-Log "Need to process $($batchesToProcess.Count) batches (29-201, excluding completed)"

# Process each batch
$successCount = 0
$failCount = 0

foreach ($batch in $batchesToProcess) {
    $batchName = $batch.Name
    $batchNum = [int]($batchName -replace 'batch_(\d+)\.sql','$1')
    $batchPath = $batch.FullName
    
    Write-Log "Processing $batchName..."
    
    try {
        # Use Supabase CLI to execute SQL
        $process = Start-Process -FilePath $SUPABASE_CLI -ArgumentList @(
            "supabase", "db", "execute", 
            "--project-ref", $PROJECT_REF,
            "--file", $batchPath
        ) -PassThru -Wait -NoNewWindow -RedirectStandardOutput "NUL" -RedirectStandardError "NUL"
        
        if ($process.ExitCode -eq 0) {
            # Mark as completed
            Add-Content -Path $PROGRESS_FILE -Value $batchName
            $successCount++
            Write-Log "✓ $batchName completed"
            
            # Progress update every 10 batches
            if ($successCount % 10 -eq 0) {
                Write-Log "Progress: $successCount batches completed, $failCount failed"
            }
        } else {
            $failCount++
            Write-Log "✗ $batchName failed (Exit code: $($process.ExitCode))"
            
            # Try to get error details
            $errorContent = Get-Content $batchPath -First 5
            Write-Log "  First lines: $errorContent"
        }
        
        # Small delay to avoid rate limiting
        Start-Sleep -Milliseconds 500
        
    } catch {
        $failCount++
        Write-Log "✗ $batchName error: $($_.Exception.Message)"
    }
}

Write-Log "Import complete! Success: $successCount, Failed: $failCount"
Write-Log "Total completed batches: $($completedBatches.Count + $successCount)"

# Show final count
Write-Host ""
Write-Host "=== IMPORT SUMMARY ==="
Write-Host "Total batches processed: $($batchesToProcess.Count)"
Write-Host "Successful: $successCount"
Write-Host "Failed: $failCount"
Write-Host "Progress file: $PROGRESS_FILE"
Write-Host "Log file: $LOG_FILE"

}
