# Split 09_seed_ats_companies.sql into smaller parts for Supabase SQL Editor
# Each part contains ~50 INSERT statements (~500 rows each)

param(
    [string]$InputFile = "C:\Users\USER\Desktop\Automation\Upwork\supabase\09_seed_ats_companies.sql",
    [int]$InsertsPerChunk = 20
)

$content = Get-Content $InputFile -Raw

# Find all INSERT statement blocks (INSERT INTO ... ON CONFLICT ... DO NOTHING;)
$pattern = '(?s)(INSERT INTO watched_companies\s*\(id, name, platform, board_token, careers_url, region, active, created_at, updated_at\)\s*VALUES\s*.*?ON CONFLICT\s*\(careers_url\)\s*DO NOTHING\s*;)'
$inserts = [regex]::Matches($content, $pattern)

Write-Host "Found $($inserts.Count) INSERT statements"

# Split into chunks
$chunks = @()
for ($i = 0; $i -lt $inserts.Count; $i += $InsertsPerChunk) {
    $chunkInserts = $inserts[$i..([Math]::Min($i + $InsertsPerChunk - 1, $inserts.Count - 1))]
    $chunks += ,@($chunkInserts)
}

Write-Host "Split into $($chunks.Count) chunks"

# Generate part files
$basePath = [System.IO.Path]::GetDirectoryName($InputFile)
$totalParts = $chunks.Count

for ($partNum = 0; $partNum -lt $chunks.Count; $partNum++) {
    $partIndex = $partNum + 1
    $partFile = Join-Path $basePath ("09_seed_ats_companies_part{0:D2}.sql" -f $partIndex)
    
    $header = @"
-- 09_seed_ats_companies_part$($partIndex.ToString("D2")).sql
-- Part $partIndex of $totalParts — run sequentially after 08_auditor.sql
-- Each part uses ON CONFLICT DO NOTHING, safe to re-run

"@
    
    $body = ($chunks[$partNum] | ForEach-Object { $_.Value }) -join "`n`n"
    
    Set-Content -Path $partFile -Value ($header + "`n" + $body + "`n") -Encoding UTF8
    Write-Host "Created: $partFile"
}

Write-Host "`nDone! Created $totalParts part files."