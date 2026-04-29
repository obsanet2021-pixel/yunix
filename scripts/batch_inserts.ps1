# Split INSERT statements into batches of 100
$INPUT_FILE = "C:\Users\Free user\yunix\scripts\inserts_only.sql"
$OUTPUT_DIR = "C:\Users\Free user\yunix\scripts\batches"
$BATCH_SIZE = 100

if (-not (Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Path $OUTPUT_DIR | Out-Null
}

Write-Host "Splitting INSERTs into batches of $BATCH_SIZE..."
$lines = Get-Content $INPUT_FILE
$batch_num = 0
$current_batch = @()

foreach ($line in $lines) {
    $current_batch += $line
    
    if ($current_batch.Count -ge $BATCH_SIZE) {
        $batch_num++
        $batch_file = "$OUTPUT_DIR\batch_$batch_num.sql"
        $current_batch | Out-File -FilePath $batch_file -Encoding utf8
        Write-Host "  Created batch $batch_num"
        $current_batch = @()
    }
}

# Last batch
if ($current_batch.Count -gt 0) {
    $batch_num++
    $batch_file = "$OUTPUT_DIR\batch_$batch_num.sql"
    $current_batch | Out-File -FilePath $batch_file -Encoding utf8
    Write-Host "  Created batch $batch_num"
}

Write-Host "Done. Created $batch_num batches in $OUTPUT_DIR"
