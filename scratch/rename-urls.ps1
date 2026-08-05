$rootDir = "c:\Users\Lenovo\.gemini\antigravity-ide\scratch\tradepilot\src"
$files = Get-ChildItem -Path $rootDir -Recurse -Include *.ts,*.tsx

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $changed = $false
    if ($content -match 'tradepilot\.app') {
        $content = $content -replace 'tradepilot\.app', 'tradcopilot.com'
        $changed = $true
    }
    if ($content -match 'tradepilot\.ai') {
        $content = $content -replace 'tradepilot\.ai', 'tradcopilot.com'
        $changed = $true
    }
    if ($content -match 'tradepilot\.com') {
        $content = $content -replace '(?<!tradcopilot\.)tradepilot\.com', 'tradcopilot.com'
        $changed = $true
    }
    if ($changed) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "Updated URLs: $($file.FullName)"
    }
}
Write-Host "Done!"
