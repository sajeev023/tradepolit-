$rootDir = "c:\Users\Lenovo\.gemini\antigravity-ide\scratch\tradepilot\src"
$files = Get-ChildItem -Path $rootDir -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $changed = $false

    # Fix domains: TradCopilot.ai -> tradcopilot.com, TradCopilot.app -> tradcopilot.com
    if ($content -match 'TradCopilot\.(ai|app)') {
        $newContent = $content -replace 'TradCopilot\.ai', 'tradcopilot.com'
        $newContent = $newContent -replace 'TradCopilot\.app', 'tradcopilot.com'
        if ($newContent -ne $content) {
            [System.IO.File]::WriteAllText($file.FullName, $newContent)
            $changed = $true
            Write-Host "Fixed domains: $($file.FullName)"
        }
    }
}
Write-Host "Done!"
