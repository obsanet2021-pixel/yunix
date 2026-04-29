# PowerShell script to filter 02_data.sql for a specific user
$OLD_UUID = "729edbb5-3a37-4b62-b20b-2480dc5c7b2a"
$NEW_UUID = "ec850929-598f-41b3-a23c-7f0ceb464b8c"
$INPUT_FILE = "C:\Users\Free user\yunix\yunix_export\yunix_export\database\02_data.sql"
$OUTPUT_FILE = "C:\Users\Free user\yunix\scripts\02_data_filtered.sql"

# First pass: collect prop_firm IDs owned by the user
$prop_firm_ids = @{}
$current_table = $null

Write-Host "Pass 1: Collecting prop_firm IDs..."
Get-Content $INPUT_FILE | ForEach-Object {
    $line = $_.Trim()
    if ($line -match "^-- Data for Name:\s+(\w+)") {
        $current_table = $matches[1]
    }
    if ($current_table -eq "prop_firms" -and $line -match "INSERT INTO public\.prop_firms") {
        if ($line -like "*$OLD_UUID*") {
            # Extract the id column (first UUID in the line)
            if ($line -match "'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'") {
                $prop_firm_ids[$matches[1]] = $true
            }
        }
    }
}

Write-Host "Found $($prop_firm_ids.Count) prop_firms owned by user"

# Second pass: filter and remap
Write-Host "Pass 2: Filtering and remapping SQL..."
$output_lines = @()
$current_table = $null
$table_header = @()
$inserts = @()
$in_table_block = $false

function Flush-Table {
    if ($script:inserts.Count -gt 0) {
        $script:output_lines += $script:table_header
        $script:output_lines += $script:inserts
        $script:output_lines += ""
    }
    $script:table_header = @()
    $script:inserts = @()
}

$lines = Get-Content $INPUT_FILE
foreach ($raw_line in $lines) {
    $line = $raw_line.Trim()
    
    if ($line -match "^-- Data for Name:\s+(\w+)") {
        Flush-Table
        $current_table = $matches[1]
        $in_table_block = $true
        $table_header = @($raw_line)
        continue
    }
    
    if (-not $in_table_block) {
        $output_lines += $raw_line
        continue
    }
    
    if ($line -match "ALTER TABLE.*ENABLE TRIGGER ALL") {
        Flush-Table
        $in_table_block = $false
        $current_table = $null
        continue
    }
    
    if (-not $line.StartsWith("INSERT INTO public.")) {
        $table_header += $raw_line
        continue
    }
    
    # Check if we should keep this INSERT
    $keep = $false
    
    # Direct user_id match (UUID may or may not have ::uuid suffix)
    if ($line -like "*'$OLD_UUID'*") {
        $keep = $true
    }
    
    # prop_firm_id match for related tables
    if (-not $keep) {
        foreach ($pf_id in $prop_firm_ids.Keys) {
            if ($line -like "*'$pf_id'*") {
                $keep = $true
                break
            }
        }
    }
    
    if ($keep) {
        $remapped = $raw_line -replace [regex]::Escape("'$OLD_UUID'::uuid"), "'$NEW_UUID'::uuid"
        $remapped = $remapped -replace [regex]::Escape("'$OLD_UUID'"), "'$NEW_UUID'"
        $inserts += $remapped
    }
}

Flush-Table

# Write output
$output_lines | Out-File -FilePath $OUTPUT_FILE -Encoding utf8
$insert_count = ($output_lines | Where-Object { $_ -match "INSERT INTO public\." }).Count
Write-Host "Done. Wrote $insert_count INSERT statements to $OUTPUT_FILE"
