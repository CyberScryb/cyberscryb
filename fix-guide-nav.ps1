$base = "C:\claude\cyberscryb\public\guides"

Get-ChildItem $base -Filter "*.html" -File | Where-Object { $_.Name -ne "index.html" } | ForEach-Object {
    $c = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    $orig = $c
    
    # Fix relative nav/footer links that go one level up (should be root-level)
    $c = $c -replace 'href="\.\./index\.html"', 'href="/"'
    $c = $c -replace 'href="\.\./about\.html"', 'href="/about/"'
    $c = $c -replace 'href="\.\./tools\.html"', 'href="/tools/"'
    $c = $c -replace 'href="\.\./contact\.html"', 'href="/contact/"'
    $c = $c -replace 'href="\.\./privacy\.html"', 'href="/privacy/"'
    $c = $c -replace 'href="\.\./terms\.html"', 'href="/terms/"'
    $c = $c -replace 'href="\.\./disclosure\.html"', 'href="/disclosure/"'
    $c = $c -replace 'href="\.\./pro\.html"', 'href="/pro/"'
    $c = $c -replace 'href="\.\./blog/"', 'href="/blog/"'
    # Fix guides cross-links (guide-to-guide links)
    $c = $c -replace 'href="\.\./guides/([^"]+)"', 'href="/guides/$1"'
    # Fix src relative js paths
    $c = $c -replace 'src="\.\./tools/([^"]+)"', 'src="/tools/$1"'
    
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($_.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "Fixed nav: $($_.Name)"
    }
}
Write-Host "Done."
