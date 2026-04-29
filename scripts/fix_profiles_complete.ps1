# Fix profiles table INSERT - remove both 'name' and 'bio' columns
$PHASES_DIR = "C:\Users\Free user\yunix\scripts\phases"

Write-Host "Fixing profiles table schema (removing name and bio columns)..."

for ($i = 1; $i -le 10; $i++) {
    $phaseFile = "$PHASES_DIR\phase_$i.sql"
    
    if (-not (Test-Path $phaseFile)) {
        continue
    }
    
    # Read the file
    $content = Get-Content $phaseFile -Raw
    
    # Find and fix the profiles INSERT statement
    # Original: INSERT INTO public.profiles (id, email, name, bio, avatar_url, created_at, updated_at, account_type, telegram_chat_id, telegram_link_code, telegram_linked_at) VALUES ('ec850929-598f-41b3-a23c-7f0ceb464b8c', 'obsanet2021@gmail.com', 'Sontrading', '', 'https://...', ...)
    
    # Replace with corrected version (no name, no bio)
    $oldPattern = "INSERT INTO public.profiles \(id, email, name, bio, avatar_url, created_at, updated_at, account_type, telegram_chat_id, telegram_link_code, telegram_linked_at\) VALUES \('ec850929-598f-41b3-a23c-7f0ceb464b8c', 'obsanet2021@gmail.com', 'Sontrading', '', 'https://bduwtkejrfmcggfwniqe.supabase.co/storage/v1/object/public/certificates/avatars/729edbb5-3a37-4b62-b20b-2480dc5c7b2a-0.41470812871565144.jpg', '2025-12-18 11:06:50.083497\+00', '2026-04-15 04:40:38.430768\+00', 'Personal', 5543308273, NULL, '2025-12-18 15:35:39.454\+00'\) ON CONFLICT DO NOTHING;"
    
    $newStatement = "INSERT INTO public.profiles (id, email, avatar_url, created_at, updated_at, account_type, telegram_chat_id, telegram_link_code, telegram_linked_at) VALUES ('ec850929-598f-41b3-a23c-7f0ceb464b8c', 'obsanet2021@gmail.com', 'https://bduwtkejrfmcggfwniqe.supabase.co/storage/v1/object/public/certificates/avatars/729edbb5-3a37-4b62-b20b-2480dc5c7b2a-0.41470812871565144.jpg', '2025-12-18 11:06:50.083497+00', '2026-04-15 04:40:38.430768+00', 'Personal', 5543308273, NULL, '2025-12-18 15:35:39.454+00') ON CONFLICT DO NOTHING;"
    
    if ($content -match $oldPattern) {
        $content = $content -replace $oldPattern, $newStatement
        $content | Out-File -FilePath $phaseFile -Encoding utf8
        Write-Host "  Fixed profiles INSERT in phase_$i.sql"
    }
}

Write-Host ""
Write-Host "Done! Profiles INSERT has been fixed."
Write-Host "Re-run phase 10 in Supabase SQL Editor."
