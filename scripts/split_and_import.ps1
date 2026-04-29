# Split the filtered SQL file into chunks and import via Supabase MCP
$INPUT_FILE = "C:\Users\Free user\yunix\scripts\02_data_filtered.sql"
$CHUNK_SIZE = 100  # INSERTs per chunk
$OUTPUT_DIR = "C:\Users\Free user\yunix\scripts\chunks"

if (-not (Test-Path $OUTPUT_DIR)) {
    New-Item -ItemType Directory -Path $OUTPUT_DIR | Out-Null
}

Write-Host "Splitting SQL file into chunks..."
$lines = Get-Content $INPUT_FILE
$chunk_num = 0
$insert_count = 0
$current_chunk = @()
$header_lines = @()

foreach ($line in $lines) {
    if ($line -match "^-- Data for Name:" -or $line -match "^SET " -or $line -match "^ALTER TABLE") {
        $header_lines += $line
        continue
    }
    
    if ($line -match "^INSERT INTO public\.") {
        $insert_count++
        $current_chunk += $line
        
        if ($insert_count -ge $CHUNK_SIZE) {
            $chunk_num++
            $chunk_file = "$OUTPUT_DIR\chunk_$chunk_num.sql"
            $header_lines + $current_chunk | Out-File -FilePath $chunk_file -Encoding utf8
            Write-Host "  Created chunk $chunk_num with $insert_count INSERTs"
            $current_chunk = @()
            $insert_count = 0
        }
    } else {
        $current_chunk += $line
    }
}

# Last chunk
if ($current_chunk.Count -gt 0) {
    $chunk_num++
    $chunk_file = "$OUTPUT_DIR\chunk_$chunk_num.sql"
    $header_lines + $current_chunk | Out-File -FilePath $chunk_file -Encoding utf8
    Write-Host "  Created chunk $chunk_num with $insert_count INSERTs"
}

Write-Host "Done. Created $chunk_num chunks in $OUTPUT_DIR"
