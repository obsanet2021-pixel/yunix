# Extract only INSERT statements from the filtered SQL file
$INPUT_FILE = "C:\Users\Free user\yunix\scripts\02_data_filtered.sql"
$OUTPUT_FILE = "C:\Users\Free user\yunix\scripts\inserts_only.sql"

Write-Host "Extracting INSERT statements..."
$lines = Get-Content $INPUT_FILE
$inserts = @()

foreach ($line in $lines) {
    if ($line -match "^INSERT INTO public\.") {
        $inserts += $line
    }
}

$inserts | Out-File -FilePath $OUTPUT_FILE -Encoding utf8
Write-Host "Extracted $($inserts.Count) INSERT statements to $OUTPUT_FILE"
