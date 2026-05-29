$base = "C:\claude\cyberscryb\public"

# Fix all remaining cyberscryb.com/*.html references in JSON-LD across guides, blog, and root pages
# This handles "url", "mainEntityOfPage", "@id" fields and nav href= attributes

$targets = @(
    "$base\guides",
    "$base\blog",
    $base
)

foreach ($dir in $targets) {
    if (Test-Path $dir -PathType Leaf) { continue }  # skip if it's a file
    
    $htmlfiles = if ($dir -eq $base) {
        Get-ChildItem $dir -Filter "*.html" -File  # only root-level files, not recursive
    } else {
        Get-ChildItem $dir -Filter "*.html" -File
    }
    
    foreach ($f in $htmlfiles) {
        $c = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
        $orig = $c
        
        # Fix JSON-LD "url", "@id", "mainEntityOfPage" string values ending in .html
        # Pattern: "key": "https://cyberscryb.com/anything.html"
        $c = $c -replace '"(https://cyberscryb\.com/[^"]+)\.html"', '"$1/"'
        
        # Fix href="/something.html" nav/footer links
        $c = $c -replace 'href="/([^"]+)\.html"', 'href="/$1/"'
        
        if ($c -ne $orig) {
            [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
            Write-Host "Fixed: $($f.Name)"
        }
    }
}

Write-Host "Done."
