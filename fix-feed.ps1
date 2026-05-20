$file = "C:\claude\cyberscryb\public\feed.xml"
$c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Fix blog links/guids: .html -> /
$c = $c -replace '(https://cyberscryb\.com/blog/[^<]+)\.html', '$1/'

# Fix guide links/guids: .html -> /
$c = $c -replace '(https://cyberscryb\.com/guides/[^<]+)\.html', '$1/'

[System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
Write-Host "Feed.xml fixed"
