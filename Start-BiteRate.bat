@echo off
setlocal
title Bite Rate - move to a new computer
set "BITERATE_LAUNCHER=%~f0"
set "BITERATE_MODE=Install"
if /I "%~1"=="--self-test" set "BITERATE_MODE=SelfTest"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$env:PSModulePath=$PSHOME+'\Modules;'+[Environment]::GetEnvironmentVariable('PSModulePath','Machine'); $s=[IO.File]::ReadAllText($env:BITERATE_LAUNCHER); $p=($s -split '(?m)^# BEGIN POWERSHELL\r?$',2)[1]; & ([scriptblock]::Create($p)) -Mode $env:BITERATE_MODE"
set "BITERATE_RESULT=%ERRORLEVEL%"
if not "%BITERATE_RESULT%"=="0" echo Setup stopped. Your project files have been kept. Read the error above and run this file again.
if /I not "%~1"=="--self-test" pause
exit /b %BITERATE_RESULT%
# BEGIN POWERSHELL
param([ValidateSet('Install','SelfTest','Library')][string]$Mode = 'Install')
$ErrorActionPreference = 'Stop'
# Compatible with the Windows PowerShell 5.1 included with Windows 10/11.
$Repo = 'roshanarun1991/BiteRate'
$RepoUrl = 'https://github.com/roshanarun1991/BiteRate.git'
$Site = 'https://roshanarun1991.github.io/BiteRate/'
$WranglerVersion = '4.151.3'
$Account = 'ad24429455fe95738133b4c8302b4a6a'

function Run([string]$Exe, [string[]]$Arguments) {
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Exe failed (exit $LASTEXITCODE). Fix the error shown above and rerun the launcher." }
}
function Capture([string]$Exe, [string[]]$Arguments) {
    $output = & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Exe failed (exit $LASTEXITCODE). No later setup steps were run." }
    return ($output -join "`n")
}
function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
        [Environment]::GetEnvironmentVariable('Path','User') + ';' + $env:Path
}
function Ensure-Tool([string]$Command, [string]$Package) {
    if (Get-Command $Command -ErrorAction SilentlyContinue) { return }
    if (!(Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw "Windows App Installer (WinGet) is missing. Install/update App Installer from Microsoft Store, reopen this launcher, and try again. Package needed: $Package"
    }
    Write-Host "Installing $Package from the Windows package catalog..."
    Run 'winget.exe' @('install','--id',$Package,'--exact','--source','winget','--accept-source-agreements','--accept-package-agreements')
    Refresh-Path
    if (!(Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "$Package was installed but is not available yet. Restart Windows if requested, then run this launcher again."
    }
}
function Is-OurRemote([string]$Remote) {
    return $Remote.Trim() -match '^(https://github\.com/roshanarun1991/BiteRate(?:\.git)?/?|git@github\.com:roshanarun1991/BiteRate(?:\.git)?)$'
}
function Assert-WorkerUrl([string]$Url) {
    if ($Url -notmatch '^https://biterate-votes\.[a-z0-9-]+\.workers\.dev/?$') {
        throw 'The Worker address must be https://biterate-votes.YOUR-SUBDOMAIN.workers.dev (no path or query).'
    }
    return $Url.TrimEnd('/')
}
function Find-WorkerUrl([string]$Output) {
    $match = [regex]::Match($Output, 'https://biterate-votes\.[a-z0-9-]+\.workers\.dev\b')
    if ($match.Success) { return (Assert-WorkerUrl $match.Value) }
    return ''
}
function Write-Utf8([string]$Path, [string]$Text) {
    [IO.File]::WriteAllText($Path, $Text, (New-Object Text.UTF8Encoding($false)))
}
function Set-WorkerConfig([string]$Path, [string]$Id, [string]$AccountId) {
    if ($Id -notmatch '^[a-f0-9]{32}$' -or $AccountId -notmatch '^[a-f0-9]{32}$') {
        throw 'Invalid Cloudflare namespace or account ID.'
    }
    # This small, dedicated Worker has a single VOTES binding. No secret goes here.
    $text = @"
name = "biterate-votes"
main = "index.js"
compatibility_date = "2025-01-01"
account_id = "$AccountId"
workers_dev = true

[[kv_namespaces]]
binding = "VOTES"
id = "$Id"

[vars]
ALLOWED_ORIGIN = "https://roshanarun1991.github.io"
"@
    Write-Utf8 $Path ($text + "`n")
}
function Assert-SetupChanges([string[]]$Paths) {
    foreach ($path in $Paths) {
        if ($path -and $path -notin @('worker/wrangler.toml','data/config.json')) {
            throw "There are other edits ($path). Commit or save them before publishing the Cloudflare connection. The launcher will not overwrite them."
        }
    }
}
function Setup-GitHub {
    & gh.exe auth status --hostname github.com 2>$null | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Run 'gh.exe' @('auth','login','--hostname','github.com','--git-protocol','https','--web')
    }
    $login = Capture 'gh.exe' @('api','user','--jq','.login')
    if ($login.Trim() -ne 'roshanarun1991') { throw 'Sign in to GitHub CLI as roshanarun1991, then rerun. The launcher will not change another account.' }
    Run 'gh.exe' @('auth','setup-git','--hostname','github.com')
}
function Setup-Cloudflare {
    Assert-SetupChanges ((Capture 'git.exe' @('diff','--name-only','HEAD')) -split "`n")
    if (Capture 'git.exe' @('diff','--cached','--name-only')) { throw 'There are staged changes. Commit or unstage them before running Cloudflare setup.' }
    Write-Host 'This deploys biterate-votes and renews its private connection token in Cloudflare and GitHub.'
    Write-Host 'It reuses the existing votes database. It does not enable Google billing or buy a Cloudflare plan.'
    Write-Host 'In Cloudflare, check Workers & Pages > Plans and confirm this account uses Workers Free.'
    Start-Process "https://dash.cloudflare.com/$Account/workers/plans"
    if ((Read-Host 'Type FREE after checking your plan, or press Enter to skip') -cne 'FREE') { return }
    Setup-GitHub
    $env:CLOUDFLARE_ACCOUNT_ID = $Account
    $env:WRANGLER_SEND_METRICS = 'false'
    # This project uses OAuth login, not an exported API token from the old PC.
    if ($env:CLOUDFLARE_API_TOKEN -or $env:CLOUDFLARE_API_KEY) {
        throw 'A Cloudflare API credential is already set in this terminal. Open a terminal without that credential and rerun to use browser login.'
    }
    Push-Location (Join-Path $Root 'worker')
    try {
        $wr = @('--yes',"wrangler@$WranglerVersion")
        Run 'npx.cmd' ($wr + @('login'))
        Run 'npx.cmd' ($wr + @('whoami'))
        $list = Capture 'npx.cmd' ($wr + @('kv','namespace','list'))
        $namespaces = @($list | ConvertFrom-Json)
        $configPath = Join-Path $Root 'worker/wrangler.toml'
        $config = [IO.File]::ReadAllText($configPath)
        $idMatch = [regex]::Match($config, '(?m)^\s*id\s*=\s*"([a-f0-9]{32})"')
        $id = ''
        if ($idMatch.Success) {
            $id = $idMatch.Groups[1].Value
            if (!($namespaces | Where-Object { $_.id -eq $id })) {
                throw 'The configured votes database is not in this account. Check your login; no replacement database was created.'
            }
        } else {
            $existing = @($namespaces | Where-Object { $_.title -in @('biterate-votes-VOTES','VOTES') })
            if ($existing.Count -gt 1) { throw 'More than one matching votes database exists. Set the correct ID in worker/wrangler.toml before retrying.' }
            if ($existing.Count -eq 0) {
                Run 'npx.cmd' ($wr + @('kv','namespace','create','VOTES'))
                $namespaces = @((Capture 'npx.cmd' ($wr + @('kv','namespace','list'))) | ConvertFrom-Json)
                $existing = @($namespaces | Where-Object { $_.title -in @('biterate-votes-VOTES','VOTES') })
            }
            if ($existing.Count -ne 1) { throw 'Could not identify the created VOTES database. Set its ID in worker/wrangler.toml, then rerun.' }
            $id = $existing[0].id
        }
        Set-WorkerConfig $configPath $id $Account
        $deployment = Capture 'npx.cmd' ($wr + @('deploy'))
        Write-Host $deployment
        $workerUrl = Find-WorkerUrl $deployment
        if (!$workerUrl) { $workerUrl = Assert-WorkerUrl (Read-Host 'Paste the workers.dev address shown by the deployment') }
        # Generate 256 random bits. Pass only through stdin; never save or print the token.
        $bytes = New-Object byte[] 32
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
        $token = [Convert]::ToBase64String($bytes)
        try {
            $token | & npx.cmd @wr secret put ADMIN_TOKEN
            if ($LASTEXITCODE -ne 0) { throw 'Cloudflare secret update failed. Rerun Cloudflare setup to renew both sides.' }
            $token | & gh.exe secret set BITERATE_ADMIN_TOKEN --repo $Repo
            if ($LASTEXITCODE -ne 0) { throw 'GitHub secret update failed. Rerun Cloudflare setup to renew both sides; the public site still works.' }
            # Read-only verification. Never create test votes in the public database.
            $export = Invoke-RestMethod "$workerUrl/export" -Headers @{Authorization="Bearer $token"} -TimeoutSec 30
            $null = $export
        } finally {
            $token = $null
            [Array]::Clear($bytes,0,$bytes.Length)
        }
        $null = Invoke-RestMethod "$workerUrl/tallies" -TimeoutSec 30
        Write-Utf8 (Join-Path $Root 'data/config.json') ((@{ votes_api = $workerUrl } | ConvertTo-Json -Compress) + "`n")
    } finally { Pop-Location }
    Run $Python @('tests/test_site.py')
    Run 'node.exe' @('worker/test_worker.mjs')
    $gitName = & git.exe config user.name
    if (!$gitName) { Run 'git.exe' @('config','user.name','roshanarun1991') }
    $gitEmail = & git.exe config user.email
    if (!$gitEmail) { Run 'git.exe' @('config','user.email','roshanarun1991@users.noreply.github.com') }
    Run 'git.exe' @('add','--','worker/wrangler.toml','data/config.json')
    if (Capture 'git.exe' @('diff','--cached','--name-only')) {
        Run 'git.exe' @('commit','-m','Connect Cloudflare shared votes')
    }
    # Never force-push or automatically resolve someone else's changes.
    Run 'git.exe' @('push','origin','HEAD:main')
    Write-Host "Cloudflare is connected: $workerUrl"
    Start-Process "https://github.com/$Repo/actions"
}
function Test-Launcher {
    $count = 0
    function Assert([bool]$Ok, [string]$Name) {
        if (!$Ok) { throw "FAIL: $Name" }
        Write-Host "PASS: $Name"
        $script:TestCount++
    }
    $script:TestCount = 0
    Assert (Is-OurRemote $RepoUrl) 'HTTPS repository'
    Assert (Is-OurRemote 'git@github.com:roshanarun1991/BiteRate.git') 'SSH repository'
    Assert (!(Is-OurRemote 'https://github.com/attacker/BiteRate.git')) 'Reject different repository'
    Assert (!(Is-OurRemote 'https://github.com/roshanarun1991/BiteRate.git.evil')) 'Reject suffix injection'
    Assert ((Find-WorkerUrl 'Deployed https://biterate-votes.example.workers.dev') -eq 'https://biterate-votes.example.workers.dev') 'Deployment URL parsing'
    foreach ($url in @('http://biterate-votes.example.workers.dev','https://evil.test','https://biterate-votes.example.workers.dev.evil.test','https://biterate-votes.example.workers.dev/?token=x')) {
        $rejected = $false
        try { $null = Assert-WorkerUrl $url } catch { $rejected = $true }
        Assert $rejected "Reject unsafe Worker address: $url"
    }
    Assert-SetupChanges @('worker/wrangler.toml','data/config.json')
    Assert $true 'Allow interrupted setup edits'
    $rejected = $false
    try { Assert-SetupChanges @('src/data.js') } catch { $rejected = $true }
    Assert $rejected 'Preserve other edits'
    $rejected = $false
    try { Set-WorkerConfig 'never-written.toml' 'bad-id' $Account } catch { $rejected = $true }
    Assert $rejected 'Reject invalid namespace before writing'
    $testDir = Join-Path ([IO.Path]::GetTempPath()) ('BiteRate-selftest-' + [guid]::NewGuid().ToString('N'))
    $null = New-Item -ItemType Directory -Path $testDir
    try {
        $file = Join-Path $testDir 'config with spaces.toml'
        Set-WorkerConfig $file ('a' * 32) $Account
        $first = [IO.File]::ReadAllText($file)
        Set-WorkerConfig $file ('a' * 32) $Account
        Assert ($first -eq [IO.File]::ReadAllText($file)) 'Idempotent configuration'
        Assert ($first.Contains('ALLOWED_ORIGIN = "https://roshanarun1991.github.io"')) 'Correct Pages origin'
        Assert (!$first.Contains('ADMIN_TOKEN')) 'No secret in configuration'
        Assert ($first.Contains('id = "' + ('a' * 32) + '"')) 'Namespace persisted'
    } finally {
        # Delete only this test's newly created, precisely named temporary directory.
        $resolved = (Resolve-Path -LiteralPath $testDir).Path
        $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
        if ($resolved.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -and
            (Split-Path $resolved -Leaf) -match '^BiteRate-selftest-[a-f0-9]{32}$') {
            Remove-Item -LiteralPath $resolved -Recurse -Force
        } else { throw 'Unexpected self-test cleanup path.' }
    }
    Write-Host "$script:TestCount launcher checks passed. No installs, logins, deployments or repository edits."
}
if ($Mode -eq 'Library') { return }
try {
    if ($Mode -eq 'SelfTest') { Test-Launcher; exit 0 }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Write-Host 'BITE RATE STOCKHOLM - new computer setup'
    Write-Host 'Installs missing Git, Node LTS, GitHub CLI and Python. Internet and Windows 10/11 required.'
    Write-Host 'Approve any Windows installation prompt. No Google key or paid service is enabled.'
    Ensure-Tool 'git.exe' 'Git.Git'
    Ensure-Tool 'node.exe' 'OpenJS.NodeJS.LTS'
    $nodeMajor = [int]((Capture 'node.exe' @('-p','process.versions.node.match(/^[0-9]+/)[0]')).Trim())
    if ($nodeMajor -lt 22) { throw 'Node 22 or newer is needed. Update Node LTS from nodejs.org and run this again.' }
    Ensure-Tool 'gh.exe' 'GitHub.cli'
    # Use the Python launcher to avoid the Windows Store python.exe stub.
    Ensure-Tool 'py.exe' 'Python.Python.3.12'
    $documents = [Environment]::GetFolderPath('MyDocuments')
    if (!$documents) { throw 'Windows Documents folder could not be located.' }
    $Root = Join-Path $documents 'BiteRate'
    if (!(Test-Path -LiteralPath $Root)) {
        Run 'git.exe' @('clone','--branch','main',$RepoUrl,$Root)
    } else {
        if (!(Test-Path -LiteralPath (Join-Path $Root '.git'))) { throw "$Root already exists and is not a Git checkout. Choose a different location by moving that folder yourself; it has not been changed." }
    }
    Set-Location -LiteralPath $Root
    if (!(Is-OurRemote (Capture 'git.exe' @('remote','get-url','origin')))) { throw 'This folder belongs to a different repository. Nothing was overwritten.' }
    if ((Capture 'git.exe' @('branch','--show-current')).Trim() -ne 'main') { throw 'The existing project is on another branch. Switch to main when ready, then rerun.' }
    if (!(Capture 'git.exe' @('status','--porcelain'))) {
        Run 'git.exe' @('pull','--ff-only','origin','main')
    } else { Write-Host 'Local edits found: keeping them and skipping the update.' }
    # Local dependencies remain untracked and are rebuilt on every new computer.
    $exclude = Join-Path $Root '.git/info/exclude'
    $ignore = @('.venv/','node_modules/','.wrangler/','*.log')
    foreach ($line in $ignore) {
        if (!(Select-String -LiteralPath $exclude -SimpleMatch -Pattern $line -Quiet)) { Add-Content -LiteralPath $exclude -Value $line }
    }
    $Python = Join-Path $Root '.venv/Scripts/python.exe'
    if (!(Test-Path -LiteralPath $Python)) { Run 'py.exe' @('-3','-m','venv','.venv') }
    Run $Python @('build.py')
    Write-Host "`nProject ready: $Root"
    Write-Host 'The website and scheduled GitHub jobs keep running when this computer is off.'
    do {
        Write-Host "`n1  Connect/redeploy Cloudflare and renew the GitHub connection"
        Write-Host '2  Run project checks'
        Write-Host '3  Open project and continuation notes'
        Write-Host '4  Open the live website'
        Write-Host '0  Finish'
        $choice = Read-Host 'Choose'
        try {
            switch ($choice) {
                '1' { Setup-Cloudflare }
                '2' {
                    Test-Launcher
                    Run $Python @('tests/test_site.py')
                    Run $Python @('agent/test_agent.py')
                    Run 'node.exe' @('worker/test_worker.mjs')
                    Run $Python @('-m','pip','install','playwright==1.56.0')
                    Run $Python @('-m','playwright','install','chromium')
                    Run $Python @('tests/smoke.py')
                    Run $Python @('tests/smoke_shared.py')
                    Run $Python @('build.py')
                }
                '3' {
                    Start-Process explorer.exe -ArgumentList ('"' + $Root + '"')
                    Start-Process notepad.exe -ArgumentList ('"' + (Join-Path $Root 'CONTINUE_PROJECT.md') + '"')
                }
                '4' { Start-Process $Site }
            }
        } catch { Write-Host "`n$($_.Exception.Message)" -ForegroundColor Red }
    } while ($choice -ne '0')
    exit 0
} catch {
    Write-Host "`n$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
