$inputFile = "C:\Users\Free user\yunix\scripts\csv_trades_import.sql"
$outputDir = "C:\Users\Free user\yunix\scripts\csv_import_chunks"

# Create output directory
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# Read the SQL file
$content = Get-Content $inputFile -Raw
$lines = $content -split "`n"

# Skip header lines (first 3 lines)
$header = $lines[0..2]
$statements = $lines[3..($lines.Length-1)] | Where-Object { $_.Trim() -ne '' }

# Calculate batch size (341 trades / 7 batches = ~49 trades per batch)
$batchSize = 50
$batchCount = [Math]::Ceiling($statements.Count / $batchSize)

Write-Host "Total statements: $($statements.Count)"
Write-Host "Creating $batchCount batches of ~$batchSize trades each..."

for ($i = 0; $i -lt $batchCount; $i++) {
    $start = $i * $batchSize
    $end = [Math]::Min(($i + 1) * $batchSize - 1, $statements.Count - 1)
    
    $batchStatements = $statements[$start..$end]
    $batchNumber = $i + 1
    
    $outputFile = Join-Path $outputDir "batch_$batchNumber.sql"
    
    $outputContent = @()
    $outputContent += "-- CSV Trades Import - Batch $batchNumber of $batchCount"
    $outputContent += "-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $outputContent += ""
    $outputContent += $batchStatements
    $outputContent += ""
    $outputContent += "-- End of batch $batchNumber"
    
    $outputContent | Out-File -FilePath $outputFile -Encoding UTF8
    
    $tradeCount = $batchStatements.Count
    Write-Host "  Batch $batchNumber`: $tradeCount trades -> $outputFile"
}

Write-Host "`nDone! Created $batchCount SQL files in: $outputDir"
Write-Host "Run each batch in Supabase SQL Editor in order (1 to $batchCount)"
