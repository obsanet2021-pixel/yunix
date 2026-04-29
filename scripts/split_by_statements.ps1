$inputFile = "C:\Users\Free user\yunix\scripts\csv_trades_import.sql"
$outputDir = "C:\Users\Free user\yunix\scripts\csv_import_batches"

# Create output directory
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# Read the SQL file
$content = Get-Content $inputFile -Raw

# Extract complete INSERT statements using regex
$pattern = 'INSERT INTO public\.trades \([^)]+\) VALUES \([^)]+\) ON CONFLICT DO NOTHING;'
$matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)

$statements = @()
foreach ($match in $matches) {
    $statements += $match.Value
}

Write-Host "Total INSERT statements found: $($statements.Count)"

# Create 7 batches of ~49 trades each
$batches = 7
$batchSize = [Math]::Ceiling($statements.Count / $batches)

Write-Host "Creating $batches batches of ~$batchSize trades each..."

for ($i = 0; $i -lt $batches; $i++) {
    $start = $i * $batchSize
    $count = [Math]::Min($batchSize, $statements.Count - $start)
    
    if ($count -le 0) { break }
    
    $batchStatements = $statements[$start..($start + $count - 1)]
    $batchNumber = $i + 1
    
    $outputFile = Join-Path $outputDir "csv_trades_batch_$batchNumber.sql"
    
    $outputContent = @()
    $outputContent += "-- CSV Trades Import - Batch $batchNumber of $batches"
    $outputContent += "-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    $outputContent += "-- Trades $start to $($start + $count - 1) of $($statements.Count)"
    $outputContent += ""
    $outputContent += $batchStatements
    $outputContent += ""
    $outputContent += "-- End of batch $batchNumber"
    
    $outputContent | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host "  Batch $batchNumber`: $count trades -> csv_trades_batch_$batchNumber.sql"
}

Write-Host "`nDone! Created $batches SQL files in: $outputDir"
Write-Host "Run each batch in Supabase SQL Editor in order (1 to $batches)"
