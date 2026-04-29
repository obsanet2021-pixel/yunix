# Direct fix for profiles INSERT in phase_10.sql
$phaseFile = "C:\Users\Free user\yunix\scripts\phases\phase_10.sql"

# Read all lines
$lines = Get-Content $phaseFile
$newLines = @()

foreach ($line in $lines) {
    if ($line -match "INSERT INTO public\.profiles \(id, email, bio, avatar_url") {
        # Remove bio column and its empty value
        # Before: INSERT INTO public.profiles (id, email, bio, avatar_url, created_at, updated_at, account_type, telegram_chat_id, telegram_link_code, telegram_linked_at) VALUES ('ec850929-598f-41b3-a23c-7f0ceb464b8c', 'obsanet2021@gmail.com', '', 'https://...
        # After:  INSERT INTO public.profiles (id, email, avatar_url, created_at, updated_at, account_type, telegram_chat_id, telegram_link_code, telegram_linked_at) VALUES ('ec850929-598f-41b3-a23c-7f0ceb464b8c', 'obsanet2021@gmail.com', 'https://...
        
        $line = $line -replace ", bio", ""
        $line = $line -replace "'obsanet2021@gmail.com', '', ", "'obsanet2021@gmail.com', "
        Write-Host "Fixed profiles INSERT - removed bio column"
    }
    $newLines += $line
}

# Write back
$newLines | Out-File -FilePath $phaseFile -Encoding utf8
Write-Host "Done!"
