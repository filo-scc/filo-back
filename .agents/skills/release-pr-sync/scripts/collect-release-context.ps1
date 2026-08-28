[CmdletBinding()]
param(
    [Parameter()]
    [string]$RepositoryPath = ".",

    [Parameter()]
    [string]$BaseBranch = "master",

    [Parameter()]
    [string]$HeadBranch = "develop",

    [Parameter()]
    [switch]$Fetch
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repository = (Resolve-Path -LiteralPath $RepositoryPath).Path
$safeDirectoryArgument = "safe.directory=$repository"

function Invoke-Git {
    param([Parameter(Mandatory)][string[]]$Arguments)

    $output = & git -c $safeDirectoryArgument -C $repository @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') falhou: $($output -join [Environment]::NewLine)"
    }

    return @($output)
}

Invoke-Git -Arguments @("rev-parse", "--is-inside-work-tree") | Out-Null

if ($Fetch) {
    Invoke-Git -Arguments @("fetch", "origin", $BaseBranch, $HeadBranch, "--quiet") | Out-Null
}

$baseRef = "origin/$BaseBranch"
$headRef = "origin/$HeadBranch"

try {
    Invoke-Git -Arguments @("rev-parse", "--verify", $baseRef) | Out-Null
    Invoke-Git -Arguments @("rev-parse", "--verify", $headRef) | Out-Null
}
catch {
    $baseRef = $BaseBranch
    $headRef = $HeadBranch
    Invoke-Git -Arguments @("rev-parse", "--verify", $baseRef) | Out-Null
    Invoke-Git -Arguments @("rev-parse", "--verify", $headRef) | Out-Null
}

$countLine = (Invoke-Git -Arguments @("rev-list", "--left-right", "--count", "$baseRef...$headRef")) -join ""
$counts = $countLine.Trim() -split "\s+"
$behindBy = [int]$counts[0]
$aheadBy = [int]$counts[1]
$baseSha = ((Invoke-Git -Arguments @("rev-parse", $baseRef)) -join "").Trim()
$headSha = ((Invoke-Git -Arguments @("rev-parse", $headRef)) -join "").Trim()

$commitLines = Invoke-Git -Arguments @(
    "log",
    "--format=%H%x1f%an%x1f%aI%x1f%s%x1f%b%x1e",
    "$baseRef..$headRef"
)
$commitText = $commitLines -join "`n"
$commits = @(
    foreach ($record in ($commitText -split [char]0x1e)) {
        $trimmed = $record.Trim()
        if (-not $trimmed) { continue }
        $fields = $trimmed -split [char]0x1f, 5
        [ordered]@{
            sha = $fields[0]
            author = $fields[1]
            authoredAt = $fields[2]
            subject = $fields[3]
            body = if ($fields.Count -gt 4) { $fields[4].Trim() } else { "" }
        }
    }
)

$files = @(
    foreach ($line in (Invoke-Git -Arguments @("diff", "--name-status", "$baseRef...$headRef"))) {
        $fields = $line -split "`t"
        if ($fields.Count -lt 2) { continue }
        [ordered]@{
            status = $fields[0]
            path = $fields[-1]
            previousPath = if ($fields.Count -gt 2) { $fields[1] } else { $null }
        }
    }
)

[ordered]@{
    repositoryPath = $repository
    baseBranch = $BaseBranch
    headBranch = $HeadBranch
    baseRef = $baseRef
    headRef = $headRef
    baseSha = $baseSha
    headSha = $headSha
    aheadBy = $aheadBy
    behindBy = $behindBy
    commits = $commits
    files = $files
} | ConvertTo-Json -Depth 6
