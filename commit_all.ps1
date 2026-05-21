$files = git ls-files --others --exclude-standard
foreach ($file in $files) {
    if ($file -match "commit_all.ps1") { continue }
    if ($file.Trim() -eq "") { continue }
    Write-Host "Committing: $file"
    git add "`"$file`""
    git commit -m "chore: add $file"
}

git branch -M main
git push -u origin main -f
