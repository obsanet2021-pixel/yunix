# Recreate phase files with proper ON CONFLICT handling
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
    
    # Read batch content and add ON CONFLICT DO NOTHING to each INSERT
    $batchLines = Get-Content $batch.FullName
    $modifiedLines = @()
    
    foreach ($line in $batchLines) {
        if ($line -match "^INSERT INTO public\.") {
            # Add ON CONFLICT DO NOTHING before the semicolon
            $line = $line -replace ';$', ' ON CONFLICT DO NOTHING;'
        }
        $modifiedLines += $line
    }
    
    $phaseContent += $modifiedLines
    $batchesInCurrentPhase++
    
    # Add phase separator
    $phaseContent += "-- ========== BATCH $($batch.Name) =========="
    
    # Check if phase is complete
    if ($batchesInCurrentPhase -ge $batchesPerPhase) {
        $phaseFile = "$OUTPUT_DIR\phase_$currentPhase.sql"
        $phaseContent | Out-File -FilePath $phaseFile -Encoding utf8
        Write-Host "Created phase_$currentPhase.sql with $batchesInCurrentPhase batches (up to batch_$batchNum)"
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
Write-Host "Done! Created $currentPhase phase files with ON CONFLICT DO NOTHING"
