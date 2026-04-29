# Fix profiles table INSERT statements to match current schema
# Remove 'name' column which no longer exists

$PHASES_DIR = "C:\Users\Free user\yunix\scripts\phases"

Write-Host "Fixing profiles table schema issues..."

for ($i = 1; $i -le 10; $i++) {
    $phaseFile = "$PHASES_DIR\phase_$i.sql"
    
    if (-not (Test-Path $phaseFile)) {
        continue
    }
    
    Write-Host "Processing phase_$i.sql..."
    
    # Read all lines
    $lines = Get-Content $phaseFile
    $fixedLines = @()
    $fixCount = 0
    
    foreach ($line in $lines) {
        # Check if this is a profiles INSERT with 'name' column
        if ($line -match "INSERT INTO public\.profiles.*name.*Sontrading") {
            # Remove the 'name' column and its value from the INSERT
            # Original: INSERT INTO public.profiles (id, email, name, bio, avatar_url...)
            # Fixed:   INSERT INTO public.profiles (id, email, bio, avatar_url...)
            
            # Remove 'name' from column list
            $line = $line -replace ", name", ""
            # Remove 'Sontrading' from values list
            $line = $line -replace "'Sontrading', ", ""
            
            $fixCount++
            Write-Host "  Fixed profiles INSERT"
        }
        
        $fixedLines += $line
    }
    
    # Write back the fixed content
    $fixedLines | Out-File -FilePath $phaseFile -Encoding utf8
    Write-Host "  Fixed $fixCount profiles statements"
}

Write-Host ""
Write-Host "Done! Profiles schema issues have been fixed."
Write-Host "Re-run the phases in Supabase SQL Editor."
