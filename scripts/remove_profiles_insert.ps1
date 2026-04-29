# Remove the entire profiles INSERT statement from phase_10.sql
$phaseFile = "C:\Users\Free user\yunix\scripts\phases\phase_10.sql"

# Read all lines
$lines = Get-Content $phaseFile
$newLines = @()
$removed = $false

foreach ($line in $lines) {
    if ($line -match "INSERT INTO public\.profiles") {
        # Skip this line (remove it)
        $removed = $true
        Write-Host "Removed profiles INSERT statement"
        continue
    }
    $newLines += $line
}

# Write back
$newLines | Out-File -FilePath $phaseFile -Encoding utf8

if ($removed) {
    Write-Host "Done! Removed profiles INSERT from phase_10.sql"
} else {
    Write-Host "No profiles INSERT found (may have already been removed)"
}
