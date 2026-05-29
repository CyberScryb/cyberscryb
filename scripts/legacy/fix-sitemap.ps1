$file = "C:\claude\cyberscryb\public\sitemap.xml"
$c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Fix root-level .html pages
$c = $c -replace '<loc>(https://cyberscryb\.com/)([^/<]+)\.html</loc>', '<loc>$1$2/</loc>'

# Fix guides/*.html
$c = $c -replace '<loc>(https://cyberscryb\.com/guides/[^<]+)\.html</loc>', '<loc>$1/</loc>'

# Fix blog/*.html
$c = $c -replace '<loc>(https://cyberscryb\.com/blog/[^<]+)\.html</loc>', '<loc>$1/</loc>'

[System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
Write-Host "Sitemap fixed"
