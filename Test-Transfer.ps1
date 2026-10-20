# Offline integration tests: no network, installations, credentials or production writes.
$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot 'Start-BiteRate.bat'
$body = ([IO.File]::ReadAllText($launcher) -split '(?m)^# BEGIN POWERSHELL\r?$',2)[1]
$parseErrors = $null
$parseTokens = $null
$null = [Management.Automation.Language.Parser]::ParseInput($body,[ref]$parseTokens,[ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
. ([scriptblock]::Create($body)) -Mode Library
Test-Launcher
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('BiteRate-transfer-test-' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path (Join-Path $testRoot 'worker') -Force
$null = New-Item -ItemType Directory -Path (Join-Path $testRoot 'data') -Force
$Root = $testRoot
$Python = 'mock-python'
$script:Calls = @()
$script:NamespaceExists = $false
$script:Cancel = $false
$script:FailSecret = $false
$script:Dirty = ''
$script:TokenCloudflare = ''
$script:TokenGitHub = ''

function Assert-Test([bool]$Condition,[string]$Name) {
    if (!$Condition) { throw "FAIL: $Name" }
    Write-Host "PASS: $Name"
}
function Run([string]$Exe,[string[]]$Arguments) {
    $script:Calls += "$Exe $($Arguments -join ' ')"
    if (($Arguments -join ' ') -match 'namespace create VOTES') { $script:NamespaceExists = $true }
}
function Capture([string]$Exe,[string[]]$Arguments) {
    $command = $Arguments -join ' '
    if ($command -eq 'diff --name-only HEAD') { return $script:Dirty }
    if ($command -eq 'diff --cached --name-only') { return '' }
    if ($command -match 'namespace list') {
        if ($script:NamespaceExists) { return '[{"id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","title":"biterate-votes-VOTES"}]' }
        return '[]'
    }
    if ($command -match ' deploy$') { return 'Deployed https://biterate-votes.example.workers.dev' }
    throw "Unexpected mock command: $Exe $command"
}
function Setup-GitHub {}
function Start-Process {}
function Read-Host {
    if ($script:Cancel) { return '' }
    return 'FREE'
}
function Invoke-RestMethod { return @{tallies=@{}} }
function git.exe { $global:LASTEXITCODE=0; return 'test-user' }
function npx.cmd {
    $script:TokenCloudflare = ($input | Out-String).Trim()
    $global:LASTEXITCODE=0
}
function gh.exe {
    $script:TokenGitHub = ($input | Out-String).Trim()
    $global:LASTEXITCODE=0
    if ($script:FailSecret) { $global:LASTEXITCODE=1 }
}
$savedToken = $env:CLOUDFLARE_API_TOKEN
$savedKey = $env:CLOUDFLARE_API_KEY
$savedAccount = $env:CLOUDFLARE_ACCOUNT_ID
$savedMetrics = $env:WRANGLER_SEND_METRICS
try {
    $env:CLOUDFLARE_API_TOKEN = $null
    $env:CLOUDFLARE_API_KEY = $null
    Write-Utf8 (Join-Path $Root 'worker/wrangler.toml') 'id = "PASTE_KV_ID_HERE"'
    Write-Utf8 (Join-Path $Root 'data/config.json') '{"votes_api":""}'
    Setup-Cloudflare
    Assert-Test ($script:NamespaceExists) 'Fresh setup creates a namespace'
    Assert-Test (@($script:Calls -match 'push origin HEAD:main').Count -eq 1) 'Successful setup publishes connection'
    Assert-Test ($script:TokenCloudflare.Length -eq 44 -and $script:TokenCloudflare -eq $script:TokenGitHub) 'Same random token reaches both services via stdin'
    $config = [IO.File]::ReadAllText((Join-Path $Root 'data/config.json')) | ConvertFrom-Json
    Assert-Test ($config.votes_api -eq 'https://biterate-votes.example.workers.dev') 'Worker URL saved after verification'
    $script:Calls = @()
    Setup-Cloudflare
    Assert-Test (!($script:Calls -match 'namespace create')) 'Rerun reuses votes database'
    $script:Cancel = $true
    $script:Calls = @()
    Setup-Cloudflare
    Assert-Test ($script:Calls.Count -eq 0) 'Skipping free-plan confirmation makes no cloud changes'
    $script:Cancel = $false
    $script:FailSecret = $true
    $script:Calls = @()
    $failed = $false
    try { Setup-Cloudflare } catch { $failed = $_.Exception.Message -match 'GitHub secret update failed' }
    Assert-Test $failed 'Secret failure is actionable'
    Assert-Test (!($script:Calls -match 'push origin')) 'Secret failure prevents publishing incomplete connection'
    $script:FailSecret = $false
    $script:Dirty = 'src/data.js'
    $failed = $false
    try { Setup-Cloudflare } catch { $failed = $_.Exception.Message -match 'other edits' }
    Assert-Test $failed 'Other product edits block automatic setup commit'
    $script:Dirty = ''
    $script:NamespaceExists = $false
    $failed = $false
    try { Setup-Cloudflare } catch { $failed = $_.Exception.Message -match 'not in this account' }
    Assert-Test $failed 'Wrong account never replaces an existing votes database'
    foreach ($file in Get-ChildItem -LiteralPath $testRoot -Recurse -File) {
        Assert-Test (!([IO.File]::ReadAllText($file.FullName).Contains($script:TokenGitHub))) "No admin secret persisted in $($file.Name)"
    }
    Write-Host 'Offline transfer integration tests passed.'
} finally {
    $env:CLOUDFLARE_API_TOKEN = $savedToken
    $env:CLOUDFLARE_API_KEY = $savedKey
    $env:CLOUDFLARE_ACCOUNT_ID = $savedAccount
    $env:WRANGLER_SEND_METRICS = $savedMetrics
    $resolved = (Resolve-Path -LiteralPath $testRoot).Path
    $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if ($resolved.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path $resolved -Leaf) -match '^BiteRate-transfer-test-[a-f0-9]{32}$') {
        Remove-Item -LiteralPath $resolved -Recurse -Force
    } else { throw 'Unexpected integration-test cleanup path.' }
}
