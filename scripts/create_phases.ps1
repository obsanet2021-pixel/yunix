# Combine batches 29-201 into 10 phases for manual SQL execution
$BATCH_DIR = "C:\Users\Free user\yunix\scripts\batches"
$OUTPUT_DIR = "C:\Users\Free user\yunix\scripts\phases"

if (-not (Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Path $OUTPUT_DIR | Out-Null
}

# Get batches 29-201 sorted
$batchFiles = Get-ChildItem "$BATCH_DIR\batch_*.sql" | 
    Where-Object { 
        $num = [int]($_.Name -replace 'batch_(\d+)\.sql','$1')
        $num -ge 29 -and $num -le 201
    } |
    Sort-Object { [int]($_.Name -replace 'batch_(\d+)\.sql','$1') }

Write-Host "Found $($batchFiles.Count) batches to combine into 10 phases"

$phases = 10
$batchesPerPhase = [Math]::Ceiling($batchFiles.Count / $phases)
$currentPhase = 1
$batchesInCurrentPhase = 0
$phaseContent = @()

foreach ($batch in $batchFiles) {
    $batchNum = [int]($batch.Name -replace 'batch_(\d+)\.sql','$1')
    $batchContent = Get-Content $batch.FullName
    $phaseContent += $batchContent
    $batchesInCurrentPhase++
    
    # Add phase separator
    $phaseContent += "-- ========== BATCH $($batch.Name) =========="
    
    # Check if phase is complete
    if ($batchesInCurrentPhase -ge $batchesPerPhase) {
        $phaseFile = "$OUTPUT_DIR\phase_$currentPhase.sql"
        $phaseContent | Out-File -FilePath $phaseFile -Encoding utf8
        Write-Host "Created phase_$currentPhase.sql with $batchesInCurrentPhase batches (batch_$batchNum)"
        $currentPhase++
        $batchesInCurrentPhase = 0
        $phaseContent = @()
    }
}

# Last phase
if ($phaseContent.Count -gt 0) {
    $phaseFile = "$OUTPUT_DIR\phase_$currentPhase.sql"
    $phaseContent | Out-File -FilePath $phaseFile -Encoding utf8
    Write-Host "Created phase_$currentPhase.sql with $batchesInCurrentPhase batches"
}

Write-Host ""
Write-Host "Done! Created $currentPhase phase files in $OUTPUT_DIR"
