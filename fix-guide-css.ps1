$base = "C:\claude\cyberscryb\public\guides"

Get-ChildItem $base -Filter "*.html" -File | Where-Object { $_.Name -ne "index.html" } | ForEach-Object {
    $c = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    $orig = $c
    
    # Fix relative CSS paths -> absolute paths
    # ../style.css -> /style.css (root-level stylesheet guides use)
    $c = $c -replace 'href="\.\./style\.css"', 'href="/style.css"'
    # guide.css -> /guides/guide.css
    $c = $c -replace 'href="guide\.css"', 'href="/guides/guide.css"'
    # ../tools/shared/email-capture.css -> /tools/shared/email-capture.css
    $c = $c -replace 'href="\.\./tools/shared/email-capture\.css"', 'href="/tools/shared/email-capture.css"'
    
    # Fix relative JS paths -> absolute
    # ../tools/shared/email-capture.js -> /tools/shared/email-capture.js
    $c = $c -replace 'src="\.\./tools/shared/email-capture\.js"', 'src="/tools/shared/email-capture.js"'
    
    # Fix relative tool links: ../../tools/TOOL/index.html -> /tools/TOOL/
    $c = $c -replace 'href="\.\./\.\./tools/([^"]+)/index\.html"', 'href="/tools/$1/"'
    # Fix any ../../tools/TOOL/ -> /tools/TOOL/
    $c = $c -replace 'href="\.\./\.\./tools/([^"]+)"', 'href="/tools/$1"'
    
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($_.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "Fixed CSS paths: $($_.Name)"
    } else {
        Write-Host "No change: $($_.Name)"
    }
}
Write-Host "Done."
