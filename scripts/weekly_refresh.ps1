# 주간 데이터 갱신 파이프라인
# 흐름: 크롤(u300·devpost 공개소스) → 적재·분석재계산(loader) → seed 재생성(worker)
# 위시켓·프리모아는 로그인 쿠키 전용 venv 필요(인계서 참조) — 본 스크립트 제외, 수동 실행 대상.
#
# 사용법:
#   powershell -File scripts\weekly_refresh.ps1              # 전체 실행
#   powershell -File scripts\weekly_refresh.ps1 -SkipCrawl   # 적재+seed만
#   powershell -File scripts\weekly_refresh.ps1 -Register    # 매주 월 09:00 작업 등록
param(
    [switch]$SkipCrawl,
    [switch]$Register,
    [int]$DevpostPages = 10
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$WslPy = "/mnt/c/Users/wj941/Documents/sujibgi/pipeline/market_dashboard/app/crawler/venv-a/bin/python3"
$WinPy = "python"
$LogDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Log = Join-Path $LogDir "weekly_refresh_$Stamp.log"

function Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
    Write-Host $line
    Add-Content -Path $Log -Value $line -Encoding UTF8
}

if ($Register) {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Root\scripts\weekly_refresh.ps1`"" `
        -WorkingDirectory $Root
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 09:00
    Register-ScheduledTask -TaskName "MarketDashboard Weekly Refresh" `
        -Action $action -Trigger $trigger -Description "시장 대시보드 주간 수집·갱신" -Force | Out-Null
    Log "스케줄 등록 완료: 매주 월요일 09:00"
    exit 0
}

Set-Location $Root
Log "=== 주간 갱신 시작 ==="

# ---- 1) 크롤 (WSL venv-a) ----
if (-not $SkipCrawl) {
    Log "[1/4] u300 크롤 시작 (WSL)"
    wsl -e $WslPy scripts/crawl_u300.py --size 400 --out crawled/u300 *>> $Log
    if ($LASTEXITCODE -ne 0) { Log "u300 크롤 실패(exit=$LASTEXITCODE) — 계속 진행(기존 데이터로 적재)" }
    else { Log "u300 크롤 완료" }

    Log "[2/4] devpost 증분 크롤 시작 (최신 $DevpostPages 페이지, 신규 slug만 상세)"
    wsl -e $WslPy scripts/crawl_devpost_playwright.py --pages $DevpostPages --detail-max 0 --out crawled/devpost *>> $Log
    if ($LASTEXITCODE -ne 0) { Log "devpost 크롤 실패(exit=$LASTEXITCODE) — 계속 진행" }
    else { Log "devpost 크롤 완료" }
}
else {
    Log "[크롤 생략] -SkipCrawl"
}

# ---- 2) 적재 + 분석 재계산 ----
Log "[3/4] 적재·분석 재계산 (loader)"
Push-Location app\loader
& $WinPy run_collection.py *>> $Log
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "적재 실패 — 로그 확인: $Log" }
Pop-Location
Log "적재 완료"

# ---- 3) seed 재생성 ----
Log "[4/4] worker seed 재생성"
Push-Location app\loader
& $WinPy ..\scripts\export_seed.py *>> $Log
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "seed export 실패" }
Pop-Location

# ---- 4) 검증 ----
Push-Location app\worker
& npm test *>> $Log
Pop-Location
Log "=== 주간 갱신 완료 ==="
Log "로그: $Log"
