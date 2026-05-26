$base = "C:\claude\cyberscryb\public\tools"

Get-ChildItem $base -Filter "*.html" -Recurse -File | ForEach-Object {
    $c = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    $orig = $c
    # Fix JSON-LD and href references: cyberscryb.com/anything.html -> cyberscryb.com/anything/
    $c = $c -replace '"(https://cyberscryb\.com/[^"]+)\.html"', '"$1/"'
    # Fix href="/something.html" nav/footer links  
    $c = $c -replace 'href="/([^"]+)\.html"', 'href="/$1/"'
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($_.FullName, $c, [System.Text.Encoding]::UTF8)
        Write-Host "Fixed: $($_.Name) in $($_.DirectoryName)"
    }
}
Write-Host "Done."
