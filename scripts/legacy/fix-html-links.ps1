$base = "C:\claude\cyberscryb\public"

# Fix blog posts: JSON-LD mainEntityOfPage @id and nav/footer href .html links
Write-Host "=== Fixing Blog Post HTML references ==="
Get-ChildItem "$base\blog" -Filter "*.html" | Where-Object { $_.Name -ne "index.html" } | ForEach-Object {
    $file = $_.FullName
    $c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $orig = $c
    # Fix JSON-LD @id which still has .html
    $c = $c -replace '"@id":\s*"(https://cyberscryb\.com/blog/[^"]+)\.html"', '"@id": "$1/"'
    # Fix JSON-LD url fields in structured data
    $c = $c -replace '"url":\s*"(https://cyberscryb\.com/blog/[^"]+)\.html"', '"url": "$1/"'
    # Fix nav links from .html to clean paths
    $c = $c -replace 'href="/tools\.html"', 'href="/tools/"'
    $c = $c -replace 'href="/about\.html"', 'href="/about/"'
    $c = $c -replace 'href="/pro\.html"', 'href="/pro/"'
    $c = $c -replace 'href="/privacy\.html"', 'href="/privacy/"'
    $c = $c -replace 'href="/terms\.html"', 'href="/terms/"'
    $c = $c -replace 'href="/disclosure\.html"', 'href="/disclosure/"'
    $c = $c -replace 'href="/contact\.html"', 'href="/contact/"'
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
        Write-Host "  Fixed: $($_.Name)"
    }
}

# Fix blog index: JSON-LD BlogPosting URLs + nav links + card links
Write-Host "=== Fixing Blog Index ==="
$file = "$base\blog\index.html"
$c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
$orig = $c
# Fix JSON-LD BlogPosting url fields
$c = $c -replace '"url":\s*"(https://cyberscryb\.com/blog/[^"]+)\.html"', '"url": "$1/"'
# Fix relative blog post links (.html -> no extension, Firebase redirects)
$c = $c -replace 'href="([^"]+)\.html"', 'href="$1/"'
# Fix absolute nav .html links
$c = $c -replace 'href="/tools\.html"', 'href="/tools/"'
$c = $c -replace 'href="/about\.html"', 'href="/about/"'
$c = $c -replace 'href="/pro\.html"', 'href="/pro/"'
$c = $c -replace 'href="/privacy\.html"', 'href="/privacy/"'
$c = $c -replace 'href="/terms\.html"', 'href="/terms/"'
$c = $c -replace 'href="/disclosure\.html"', 'href="/disclosure/"'
$c = $c -replace 'href="/contact\.html"', 'href="/contact/"'
if ($c -ne $orig) {
    [System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
    Write-Host "  Fixed: blog/index.html"
}

# Fix guides index: guide card links (.html -> /)
Write-Host "=== Fixing Guides Index ==="
$file = "$base\guides\index.html"
$c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
$orig = $c
$c = $c -replace 'href="([^"]+)\.html"', 'href="$1/"'
if ($c -ne $orig) {
    [System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
    Write-Host "  Fixed: guides/index.html"
}

Write-Host "=== Done ==="
