# Remove orphaned ticket_messages that reference missing support_tickets
# These were left behind when we removed broken multiline support_tickets

$PHASES_DIR = "C:\Users\Free user\yunix\scripts\phases"

Write-Host "Removing orphaned ticket_messages..."

# List of ticket_ids that no longer exist (from the multiline removals)
$missingTicketIds = @(
    '902a4264-9306-4062-b45e-3365cb5f833a',
    '362db132-7f76-4f04-b379-d25e2bfe65fa',
    '8694bb5f-bd50-4a65-bc5f-13aab30628ab',
    'bca469e1-183b-4f74-97c0-ef1687fbf88d',
    '88081675-f7d7-4aab-85a1-989e45fd89b9',
    'f873c4a0-7b34-4f4e-bdb9-e7b0afc2acf0',
    'f9c000cd-4993-433b-8236-851530baf191'
)

$totalRemoved = 0

for ($i = 1; $i -le 10; $i++) {
    $phaseFile = "$PHASES_DIR\phase_$i.sql"
    
    if (-not (Test-Path $phaseFile)) {
        continue
    }
    
    $lines = Get-Content $phaseFile
    $originalCount = $lines.Count
    $filteredLines = $lines | Where-Object { 
        $line = $_
        $keep = $true
        foreach ($ticketId in $missingTicketIds) {
            if ($line -match "INSERT INTO public\.(support_messages|ticket_messages).*'$ticketId'") {
                $keep = $false
                break
            }
        }
        $keep
    }
    $removedCount = $originalCount - $filteredLines.Count
    $totalRemoved += $removedCount
    
    $filteredLines | Out-File -FilePath $phaseFile -Encoding utf8
    
    if ($removedCount -gt 0) {
        Write-Host "  phase_$i.sql - removed $removedCount orphaned messages"
    }
}

Write-Host ""
Write-Host "Done! Removed $totalRemoved orphaned ticket_messages total."
Write-Host "Re-run the phases in Supabase SQL Editor."
