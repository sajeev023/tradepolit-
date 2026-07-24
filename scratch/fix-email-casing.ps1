$rootDir = "c:\Users\Lenovo\.gemini\antigravity-ide\scratch\tradepilot\src"
$files = Get-ChildItem -Path $rootDir -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $content = [System.Text.Encoding]::UTF8.GetString($bytes)
    
    $newContent = $content.Replace("@TradCopilot.com", "@tradcopilot.com")
    $newContent = $newContent.Replace("%40TradCopilot.com", "%40tradcopilot.com")
    
    if ($newContent -ne $content) {
        [System.IO.File]::WriteAllText($file.FullName, $newContent)
        Write-Host "Fixed: $($file.FullName)"
    }
}
Write-Host "Done!"
