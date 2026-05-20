# Fix all .html canonical and og:url references to use clean trailing-slash URLs

$base = "C:\claude\cyberscryb\public"

# Fix guide files
Write-Host "=== Fixing Guide Files ==="
Get-ChildItem "$base\guides" -Filter "*.html" | ForEach-Object {
    $file = $_.FullName
    $c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $orig = $c
    $c = $c -replace 'href="(https://cyberscryb\.com/guides/[^"]+)\.html"', 'href="$1/"'
    $c = $c -replace 'content="(https://cyberscryb\.com/guides/[^"]+)\.html"', 'content="$1/"'
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
        Write-Host "  Fixed: $($_.Name)"
    } else {
        Write-Host "  No change: $($_.Name)"
    }
}

# Fix blog files
Write-Host "=== Fixing Blog Files ==="
Get-ChildItem "$base\blog" -Filter "*.html" | ForEach-Object {
    $file = $_.FullName
    $c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $orig = $c
    $c = $c -replace 'href="(https://cyberscryb\.com/blog/[^"]+)\.html"', 'href="$1/"'
    $c = $c -replace 'content="(https://cyberscryb\.com/blog/[^"]+)\.html"', 'content="$1/"'
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
        Write-Host "  Fixed: $($_.Name)"
    } else {
        Write-Host "  No change: $($_.Name)"
    }
}

# Fix root pages
Write-Host "=== Fixing Root Pages ==="
@("about.html","contact.html","privacy.html","terms.html","disclosure.html","pro.html","tools.html") | ForEach-Object {
    $file = "$base\$_"
    $slug = [System.IO.Path]::GetFileNameWithoutExtension($_)
    $c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $orig = $c
    $c = $c -replace "href=""https://cyberscryb\.com/$slug\.html""", "href=""https://cyberscryb.com/$slug/"""
    $c = $c -replace "content=""https://cyberscryb\.com/$slug\.html""", "content=""https://cyberscryb.com/$slug/"""
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
        Write-Host "  Fixed: $_"
    } else {
        Write-Host "  No change: $_"
    }
}

Write-Host "=== Done ==="
