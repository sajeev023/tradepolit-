$rootDir = "c:\Users\Lenovo\.gemini\antigravity-ide\scratch\tradepilot\src"
$files = Get-ChildItem -Path $rootDir -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'TradePilot') {
        $newContent = $content -replace 'TradePilot', 'TradCopilot'
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

# Also handle tradepilot.app -> tradcopilot.com and tradepilot.ai -> tradcopilot.com
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'tradepilot') {
        $newContent = $content -replace 'tradepilot\.app', 'tradcopilot.com'
        $newContent = $newContent -replace 'tradepilot\.ai', 'tradcopilot.com'
        $newContent = $newContent -replace 'tradepilot\.com', 'tradcopilot.com'
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated URLs: $($file.FullName)"
    }
}

Write-Host "Done!"
